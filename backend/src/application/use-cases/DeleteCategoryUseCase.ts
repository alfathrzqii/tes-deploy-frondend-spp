import type { ICategoryRepository } from "../../domain/repositories/ICategoryRepository.js";

export class DeleteCategoryUseCase {
  constructor(private categoryRepository: ICategoryRepository) {}

  async execute(id: number): Promise<void> {
    const category = await this.categoryRepository.findById(id);

    if (!category) {
      throw new Error("Kategori tidak ditemukan");
    }

    await this.categoryRepository.delete(id);
  }
}
