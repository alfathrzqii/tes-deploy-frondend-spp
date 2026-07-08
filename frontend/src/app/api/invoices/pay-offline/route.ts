import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth";

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
    const { studentNumber, month, year, invoiceType, paymentAmount } = await req.json();

    const student = await prisma.student.findUnique({
      where: { studentNumber },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Siswa tidak ditemukan" },
        { status: 404 }
      );
    }

    // UNIT_ADMIN isolation
    if (
      authResult.role === "UNIT_ADMIN" &&
      student.schoolUnitId !== authResult.schoolUnitId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Akses ditolak: Anda tidak memiliki otoritas untuk mengelola unit sekolah ini",
        },
        { status: 403 }
      );
    }

    const currentType = invoiceType || "SPP";
    const isSPP = currentType === "SPP";

    let baseAmount = 0;
    let discountApplied = 0;
    let netAmount = 0;

    if (isSPP) {
      const tariff = await prisma.sppTariff.findUnique({
        where: {
          uq_school_unit_enrollment_year: {
            schoolUnitId: student.schoolUnitId,
            enrollmentYear: student.enrollmentYear,
          },
        },
      });

      if (!tariff) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Gagal: Master tarif SPP untuk angkatan siswa ini belum dikonfigurasi",
          },
          { status: 400 }
        );
      }

      baseAmount = tariff.amount;
      discountApplied = Math.floor(
        (baseAmount * student.discountPercentage) / 100
      );
      netAmount = baseAmount - discountApplied;
    } else if (currentType === "UANG_PENGEMBANGAN") {
      baseAmount = 2000000; // Rp 2.000.000 default building fee
      discountApplied = 0;
      netAmount = baseAmount;
    } else {
      baseAmount = 500000; // default for other types e.g. KEGIATAN
      discountApplied = 0;
      netAmount = baseAmount;
    }

    const payAmount = paymentAmount ? Number(paymentAmount) : netAmount;

    if (payAmount <= 0) {
      return NextResponse.json(
        { success: false, message: "Nominal pembayaran wajib lebih besar dari 0" },
        { status: 400 }
      );
    }

    // Check if invoice already exists
    const existing = await prisma.invoice.findUnique({
      where: {
        uq_student_billing_period: {
          studentId: student.id,
          month: Number(month),
          year: Number(year),
          invoiceType: currentType,
        },
      },
      include: {
        transactions: {
          where: { type: "INCOME" },
        },
      },
    });

    if (existing && existing.status === "PAID") {
      return NextResponse.json(
        {
          success: false,
          message: `Gagal: Tagihan ${currentType} untuk periode tersebut sudah lunas`,
        },
        { status: 400 }
      );
    }

    // Calculate remaining balance
    const targetTotalAmount = existing ? existing.amount : netAmount;
    const alreadyPaid = existing
      ? existing.transactions.reduce((sum, tx) => sum + tx.amount, 0)
      : 0;
    const remainingBalance = targetTotalAmount - alreadyPaid;

    if (payAmount > remainingBalance) {
      return NextResponse.json(
        {
          success: false,
          message: `Gagal: Nominal pembayaran melebihi sisa tagihan (Sisa: Rp ${remainingBalance.toLocaleString("id-ID")})`,
        },
        { status: 400 }
      );
    }

    // Find SPP category (INCOME type)
    let categoryName = isSPP ? "SPP" : "Uang Pengembangan";
    if (currentType === "EKSTRAKURIKULER") categoryName = "SPP"; // reuse spp or fallback
    
    const paymentCategory = await prisma.category.findFirst({
      where: { name: categoryName, type: "INCOME" },
    }) || await prisma.category.findFirst({
      where: { type: "INCOME" },
    });

    const result = await prisma.$transaction(async (tx) => {
      let invoice;
      const isNowFullyPaid = alreadyPaid + payAmount >= targetTotalAmount;
      const finalStatus = isNowFullyPaid ? "PAID" : "PARTIALLY_PAID";

      if (existing) {
        invoice = await tx.invoice.update({
          where: { id: existing.id },
          data: { status: finalStatus },
        });
      } else {
        invoice = await tx.invoice.create({
          data: {
            studentId: student.id,
            invoiceType: currentType,
            month: Number(month),
            year: Number(year),
            baseAmount,
            discountApplied,
            amount: targetTotalAmount,
            status: finalStatus,
          },
        });
      }

      const transaction = await tx.transaction.create({
        data: {
          type: "INCOME",
          categoryId: paymentCategory?.id ?? 1,
          paymentMethod: "CASH",
          amount: payAmount,
          description: `Pembayaran ${categoryName} tunai (${isNowFullyPaid ? "Lunas" : "Cicilan"}) bulan ${month}/${year} untuk siswa ${student.name}`,
          schoolUnitId: student.schoolUnitId,
          recordedById: authResult.id,
          invoiceId: invoice.id,
        },
      });

      return { invoice, transaction };
    });

    return NextResponse.json({
      success: true,
      message: `Pembayaran ${currentType} berhasil diproses (${result.invoice.status === "PAID" ? "Lunas" : "Cicilan tercatat"})`,
      data: result,
    });
  } catch (error: any) {
    console.error("[INVOICES PAY-OFFLINE POST]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan server" },
      { status: 400 }
    );
  }
}
