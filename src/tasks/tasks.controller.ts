import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserType } from '../auth/decorators/current-user.decorator';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskStatus } from 'src/generated/prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  list(
    @CurrentUser() user: CurrentUserType,
    @Query('status') status?: TaskStatus,
    @Query('q') q?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return this.tasks.list(user.id, {
      status,
      q,
      page: Math.max(1, Number(page) || 1),
      pageSize: Math.min(100, Math.max(1, Number(pageSize) || 20)),
    });
  }

  @Post()
  create(@CurrentUser() user: CurrentUserType, @Body() dto: CreateTaskDto) {
    return this.tasks.create(user.id, dto);
  }

  @Put(':id')
  update(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserType, @Param('id') id: string) {
    return this.tasks.remove(user.id, id);
  }
}
