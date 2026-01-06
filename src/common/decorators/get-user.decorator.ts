import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { getUser } from '../interfaces/common/getUser';

export const GetUser = createParamDecorator(
  (data: keyof getUser, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    const user : getUser = request.user;

    // If specific field requested → return only that
    return data ? user[data] : user;
  },
);
