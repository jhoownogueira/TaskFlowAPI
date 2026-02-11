import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async db() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        db: 'up',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.log('Database connection error:', error);
      throw new ServiceUnavailableException({
        status: 'error',
        db: 'down',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
