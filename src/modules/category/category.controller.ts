import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { sendSuccess } from '../../utils/response';
import * as categoryService from './category.service';
import {
  CategoryCreateInput,
  CategoryListQuery,
  CategoryUpdateInput,
} from './category.validation';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.createCategory(
    req.user!.id,
    req.body as CategoryCreateInput,
  );
  sendSuccess({
    res,
    statusCode: 201,
    message: 'Category created successfully',
    data: category,
  });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const data = await categoryService.listCategories(req.query as unknown as CategoryListQuery);
  sendSuccess({
    res,
    message: 'Categories retrieved successfully',
    data,
  });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.getCategoryById(req.params.id as string);
  sendSuccess({
    res,
    message: 'Category retrieved successfully',
    data: category,
  });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.updateCategory(
    req.user!.id,
    req.params.id as string,
    req.body as CategoryUpdateInput,
  );
  sendSuccess({
    res,
    message: 'Category updated successfully',
    data: category,
  });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await categoryService.deleteCategory(req.user!.id, req.params.id as string);
  sendSuccess({
    res,
    message: 'Category deleted successfully',
    data: null,
  });
});
