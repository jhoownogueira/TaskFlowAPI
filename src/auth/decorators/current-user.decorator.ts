import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type CurrentUserType = { id: string; email: string };

type RequestWithUser = Request & { user: CurrentUserType };

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): CurrentUserType => {
    const req = ctx.switchToHttp().getRequest<RequestWithUser>();
    return req.user;
  },
);
