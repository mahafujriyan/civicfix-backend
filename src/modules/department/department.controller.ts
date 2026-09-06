import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { sendSuccess } from '../../utils/response';
import * as departmentService from './department.service';
import {
  DepartmentCreateInput,
  DepartmentListQuery,
  DepartmentUpdateInput,
} from './department.validation';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const department = await departmentService.createDepartment(
    req.user!.id,
    req.body as DepartmentCreateInput,
  );
  sendSuccess({
    res,
    statusCode: 201,
    message: 'Department created successfully',
    data: department,
  });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const data = await departmentService.listDepartments(
    req.query as unknown as DepartmentListQuery,
  );
  sendSuccess({
    res,
    message: 'Departments retrieved successfully',
    data,
  });
});

export const listActive = asyncHandler(async (_req: Request, res: Response) => {
  const data = await departmentService.getActiveDepartmentsCached();
  sendSuccess({
    res,
    message: 'Active departments retrieved successfully',
    data,
  });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const department = await departmentService.getDepartmentById(req.params.id as string);
  sendSuccess({
    res,
    message: 'Department retrieved successfully',
    data: department,
  });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const department = await departmentService.updateDepartment(
    req.user!.id,
    req.params.id as string,
    req.body as DepartmentUpdateInput,
  );
  sendSuccess({
    res,
    message: 'Department updated successfully',
    data: department,
  });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await departmentService.deleteDepartment(req.user!.id, req.params.id as string);
  sendSuccess({
    res,
    message: 'Department deleted successfully',
    data: null,
  });
});
