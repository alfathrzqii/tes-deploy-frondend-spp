import type { ICategoryRepository } from "../../domain/repositories/ICategoryRepository.js";
import { Category } from "../../domain/entities/Category.js";

export class GetCategoriesUseCase {
  constructor(private categoryRepository: ICategoryRepository) {}

  async execute(filter?: { schoolUnitIds: (number | null)[] }): Promise<Category[]> {
    return await this.categoryRepository.findAll(filter);
  }
}
