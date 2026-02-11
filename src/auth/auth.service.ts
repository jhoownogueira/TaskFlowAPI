import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import type { StringValue } from 'ms';
import { JwtPayload } from './dto/jwtPayload.dto';

function getExpiresIn(raw: string | undefined, fallback: string) {
  return (raw ?? fallback) as StringValue;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private async signAccessToken(user: { id: string; email: string }) {
    const secret = process.env['JWT_ACCESS_SECRET']!;
    const expiresIn = getExpiresIn(process.env['JWT_ACCESS_EXPIRES_IN'], '15m');

    return this.jwt.signAsync(
      { sub: user.id, email: user.email },
      { secret, expiresIn },
    );
  }

  private async signRefreshToken(user: { id: string; email: string }) {
    const secret = process.env['JWT_REFRESH_SECRET']!;
    const expiresIn = getExpiresIn(process.env['JWT_REFRESH_EXPIRES_IN'], '7d');

    return this.jwt.signAsync(
      { sub: user.id, email: user.email },
      { secret, expiresIn },
    );
  }

  async register(input: { name: string; email: string; password: string }) {
    const exists = await this.users.findByEmail(input.email);
    if (exists) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await this.users.create({
      name: input.name,
      email: input.email,
      password: passwordHash,
    });

    const accessToken = await this.signAccessToken({
      id: user.id,
      email: user.email,
    });
    const refreshToken = await this.signRefreshToken({
      id: user.id,
      email: user.email,
    });

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash },
    });

    return { accessToken, refreshToken };
  }

  async login(input: { email: string; password: string }) {
    const user = await this.users.findByEmail(input.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(input.password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const accessToken = await this.signAccessToken({
      id: user.id,
      email: user.email,
    });
    const refreshToken = await this.signRefreshToken({
      id: user.id,
      email: user.email,
    });

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash },
    });

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    const secret = process.env['JWT_REFRESH_SECRET']!;
    let payload: JwtPayload;

    try {
      payload = await this.jwt.verifyAsync(refreshToken, { secret });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const userId = payload.sub;

    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const matches = await Promise.all(
      tokens.map(async (t) =>
        (await bcrypt.compare(refreshToken, t.tokenHash)) ? t : null,
      ),
    );

    const valid = matches.find(Boolean);
    if (!valid) throw new UnauthorizedException('Invalid refresh token');

    await this.prisma.refreshToken.update({
      where: { id: valid.id },
      data: { revokedAt: new Date() },
    });

    const accessToken = await this.signAccessToken({
      id: userId,
      email: payload.email,
    });
    const newRefreshToken = await this.signRefreshToken({
      id: userId,
      email: payload.email,
    });

    const tokenHash = await bcrypt.hash(newRefreshToken, 10);
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash },
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string) {
    try {
      const secret = process.env['JWT_REFRESH_SECRET']!;
      const payload: JwtPayload = await this.jwt.verifyAsync(refreshToken, {
        secret,
      });
      const userId = payload.sub;

      const tokens = await this.prisma.refreshToken.findMany({
        where: { userId, revokedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      for (const t of tokens) {
        const ok = await bcrypt.compare(refreshToken, t.tokenHash);
        if (ok) {
          await this.prisma.refreshToken.update({
            where: { id: t.id },
            data: { revokedAt: new Date() },
          });
          break;
        }
      }
    } catch {
      // Ignora
    }

    return { ok: true };
  }
}
