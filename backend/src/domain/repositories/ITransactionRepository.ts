import { Transaction } from "../entities/Transaction.js";

export interface ITransactionRepository {
  create(data: Omit<Transaction, "id" | "date">): Promise<Transaction>;
  findAll(filter?: {
    schoolUnitId?: number;
    type?: string;
    categoryId?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any[]>;
  getSummary(filter?: {
    schoolUnitId?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ totalIncome: number; totalExpense: number }>;
}
