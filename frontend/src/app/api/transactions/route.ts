import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (isAuthError(authResult)) return authResult;

  if (authResult.role !== "SUPER_ADMIN" && authResult.role !== "UNIT_ADMIN") {
    return NextResponse.json(
      { success: false, message: "Akses ditolak" },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || undefined;
    const categoryId = searchParams.get("categoryId")
      ? Number(searchParams.get("categoryId"))
      : undefined;
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined;
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined;

    let schoolUnitId = searchParams.get("schoolUnitId")
      ? Number(searchParams.get("schoolUnitId"))
      : undefined;

    // UNIT_ADMIN isolation
    if (authResult.role === "UNIT_ADMIN") {
      if (schoolUnitId && schoolUnitId !== authResult.schoolUnitId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Akses ditolak: Anda tidak memiliki otoritas untuk mengelola unit sekolah ini",
          },
          { status: 403 }
        );
      }
      schoolUnitId = authResult.schoolUnitId ?? undefined;
    }

    const where: any = {};
    if (schoolUnitId !== undefined) where.schoolUnitId = schoolUnitId;
    if (type) where.type = type;
    if (categoryId !== undefined) where.categoryId = categoryId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: { select: { name: true } },
        recordedBy: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    });

    // Compute summary
    const totalIncome = transactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + t.amount, 0);

    return NextResponse.json({
      success: true,
      message: "Data rekapitulasi jurnal kas berhasil diambil",
      summary: { totalIncome, totalExpense },
      data: transactions,
    });
  } catch (error) {
    console.error("[TRANSACTIONS GET]", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (isAuthError(authResult)) return authResult;

  if (authResult.role !== "SUPER_ADMIN" && authResult.role !== "UNIT_ADMIN") {
    return NextResponse.json(
      { success: false, message: "Akses ditolak" },
      { status: 403 }
    );
  }

  try {
    let { type, categoryId, paymentMethod, amount, description, schoolUnitId } =
      await req.json();

    // UNIT_ADMIN can only record for their own unit
    if (authResult.role === "UNIT_ADMIN") {
      schoolUnitId = authResult.schoolUnitId;
    }

    // Validate category exists and type matches
    const category = await prisma.category.findUnique({
      where: { id: Number(categoryId) },
    });
    if (!category) {
      return NextResponse.json(
        { success: false, message: "Kategori transaksi tidak valid" },
        { status: 400 }
      );
    }
    if (category.type !== type) {
      return NextResponse.json(
        {
          success: false,
          message: "Tipe kategori tidak cocok dengan konteks pencatatan",
        },
        { status: 400 }
      );
    }

    const transaction = await prisma.transaction.create({
      data: {
        type,
        categoryId: Number(categoryId),
        paymentMethod,
        amount: Number(amount),
        description,
        schoolUnitId: Number(schoolUnitId),
        recordedById: authResult.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Transaksi buku kas berhasil dicatat",
        data: transaction,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[TRANSACTIONS POST]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan server" },
      { status: 400 }
    );
  }
}
