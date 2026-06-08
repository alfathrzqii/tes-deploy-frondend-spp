import { Category } from "../entities/Category.js";

export interface ICategoryRepository {
  create(data: Omit<Category, "id">): Promise<Category>;
  findAll(filter?: { schoolUnitIds: (number | null)[] }): Promise<Category[]>;
  findById(id: number): Promise<Category | null>;
  update(id: number, data: Partial<Omit<Category, "id">>): Promise<Category>;
  delete(id: number): Promise<void>;
}
