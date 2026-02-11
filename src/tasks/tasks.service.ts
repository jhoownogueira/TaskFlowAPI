import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, TaskStatus } from 'src/generated/prisma/client';

type ListTasksQuery = {
  status?: TaskStatus;
  q?: string;
  page: number;
  pageSize: number;
};

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: ListTasksQuery) {
    const where: Prisma.TaskWhereInput = { userId };

    if (query.status) where.status = query.status;
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  create(userId: string, data: { title: string; description?: string }) {
    return this.prisma.task.create({ data: { ...data, userId } });
  }

  async update(userId: string, id: string, data: Prisma.TaskUpdateInput) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.userId !== userId) throw new ForbiddenException();

    return this.prisma.task.update({ where: { id }, data });
  }

  async remove(userId: string, id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.userId !== userId) throw new ForbiddenException();

    await this.prisma.task.delete({ where: { id } });
    return { ok: true };
  }
}
