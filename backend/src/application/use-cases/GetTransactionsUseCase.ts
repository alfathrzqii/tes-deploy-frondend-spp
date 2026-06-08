import type { ITransactionRepository } from "../../domain/repositories/ITransactionRepository.js";

export class GetTransactionsUseCase {
  constructor(private transactionRepository: ITransactionRepository) {}

  async execute(filter?: {
    schoolUnitId?: number;
    type?: string;
    categoryId?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ summary: any; data: any[] }> {
    const transactions = await this.transactionRepository.findAll(filter);

    const summaryFilter: any = {};
    if (filter?.schoolUnitId !== undefined) summaryFilter.schoolUnitId = filter.schoolUnitId;
    if (filter?.startDate !== undefined) summaryFilter.startDate = filter.startDate;
    if (filter?.endDate !== undefined) summaryFilter.endDate = filter.endDate;

    const summaryData = await this.transactionRepository.getSummary(summaryFilter);

    const summary = {
      totalIncome: summaryData.totalIncome,
      totalExpense: summaryData.totalExpense,
      currentBalance: summaryData.totalIncome - summaryData.totalExpense,
    };

    return {
      summary,
      data: transactions,
    };
  }
}
