import type { Request, Response, NextFunction } from "express";
import { CreateCategoryUseCase } from "../../../application/use-cases/CreateCategoryUseCase.js";
import { GetCategoriesUseCase } from "../../../application/use-cases/GetCategoriesUseCase.js";
import { UpdateCategoryUseCase } from "../../../application/use-cases/UpdateCategoryUseCase.js";
import { DeleteCategoryUseCase } from "../../../application/use-cases/DeleteCategoryUseCase.js";
import type { ICategoryRepository } from "../../../domain/repositories/ICategoryRepository.js";

export class CategoryController {
  constructor(
    private createCategoryUseCase: CreateCategoryUseCase,
    private getCategoriesUseCase: GetCategoriesUseCase,
    private updateCategoryUseCase: UpdateCategoryUseCase,
    private deleteCategoryUseCase: DeleteCategoryUseCase,
    private categoryRepository: ICategoryRepository
  ) {}

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      let { name, type, schoolUnitId } = req.body;

      if (user.role === "UNIT_ADMIN") {
        schoolUnitId = user.schoolUnitId;
      }

      const result = await this.createCategoryUseCase.execute({
        name,
        type,
        schoolUnitId: schoolUnitId || null,
      });

      res.status(201).json({
        success: true,
        message: "Kategori keuangan berhasil ditambahkan",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      let filter: { schoolUnitIds: (number | null)[] } | undefined;

      if (user.role === "UNIT_ADMIN") {
        filter = { schoolUnitIds: [null, user.schoolUnitId!] };
      }

      const result = await this.getCategoriesUseCase.execute(filter);

      res.status(200).json({
        success: true,
        message: "Daftar kategori keuangan berhasil diambil",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;
      const categoryId = Number(id);

      const category = await this.categoryRepository.findById(categoryId);
      if (!category) {
        res.status(404).json({
          success: false,
          message: "Kategori tidak ditemukan",
        });
        return;
      }

      if (user.role === "UNIT_ADMIN") {
        if (category.schoolUnitId !== user.schoolUnitId) {
          res.status(403).json({
            success: false,
            message: "Akses ditolak: Anda tidak memiliki otoritas untuk mengelola kategori ini",
          });
          return;
        }
      }

      const { name, type } = req.body;
      const result = await this.updateCategoryUseCase.execute(categoryId, {
        name,
        type,
      });

      res.status(200).json({
        success: true,
        message: "Kategori keuangan berhasil diperbarui",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;
      const categoryId = Number(id);

      const category = await this.categoryRepository.findById(categoryId);
      if (!category) {
        res.status(404).json({
          success: false,
          message: "Kategori tidak ditemukan",
        });
        return;
      }

      if (user.role === "UNIT_ADMIN") {
        if (category.schoolUnitId !== user.schoolUnitId) {
          res.status(403).json({
            success: false,
            message: "Akses ditolak: Anda tidak memiliki otoritas untuk mengelola kategori ini",
          });
          return;
        }
      }

      await this.deleteCategoryUseCase.execute(categoryId);

      res.status(200).json({
        success: true,
        message: "Kategori keuangan berhasil dihapus",
      });
    } catch (error) {
      next(error);
    }
  }
}
