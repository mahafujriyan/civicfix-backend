import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { sendSuccess } from '../../utils/response';
import * as authService from './auth.service';
import { GoogleAuthInput, LoginInput, RegisterInput } from './auth.validation';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body as RegisterInput);
  sendSuccess({
    res,
    statusCode: 201,
    message: 'Registration successful',
    data: result,
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body as LoginInput);
  sendSuccess({
    res,
    message: 'Login successful',
    data: result,
  });
});

export const googleLogin = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.loginWithGoogle(req.body as GoogleAuthInput);
  sendSuccess({
    res,
    message: 'Google login successful',
    data: result,
  });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getMe(req.user!.id);
  sendSuccess({
    res,
    message: 'Profile retrieved successfully',
    data: user,
  });
});
