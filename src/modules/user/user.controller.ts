import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { sendSuccess } from '../../utils/response';
import * as userService from './user.service';
import {
  UpdateProfileInput,
  UpdateUserStatusInput,
  UserListQuery,
} from './user.validation';

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getProfile(req.user!.id);
  sendSuccess({
    res,
    message: 'Profile retrieved successfully',
    data: user,
  });
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateProfile(req.user!.id, req.body as UpdateProfileInput);
  sendSuccess({
    res,
    message: 'Profile updated successfully',
    data: user,
  });
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const data = await userService.listUsers(req.query as unknown as UserListQuery);
  sendSuccess({
    res,
    message: 'Users retrieved successfully',
    data,
  });
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getUserById(req.params.id as string);
  sendSuccess({
    res,
    message: 'User retrieved successfully',
    data: user,
  });
});

export const updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateUserStatus(
    req.user!.id,
    req.params.id as string,
    req.body as UpdateUserStatusInput,
  );
  sendSuccess({
    res,
    message: 'User status updated successfully',
    data: user,
  });
});
