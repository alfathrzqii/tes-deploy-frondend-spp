import type { CategoryType } from "@prisma/client";

export class Category {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly type: CategoryType,
    public readonly schoolUnitId: number | null
  ) {}
}
