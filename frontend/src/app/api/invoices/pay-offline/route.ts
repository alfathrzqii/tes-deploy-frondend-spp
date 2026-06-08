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
    const { studentNumber, month, year } = await req.json();

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

    const baseAmount = tariff.amount;
    const discountApplied = Math.floor(
      (baseAmount * student.discountPercentage) / 100
    );
    const netAmount = baseAmount - discountApplied;

    // Check if invoice already exists
    const existing = await prisma.invoice.findUnique({
      where: {
        uq_student_billing_period: {
          studentId: student.id,
          month: Number(month),
          year: Number(year),
          invoiceType: "SPP",
        },
      },
    });

    if (existing && existing.status === "PAID") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Gagal: Tagihan SPP siswa untuk bulan dan tahun tersebut sudah lunas",
        },
        { status: 400 }
      );
    }

    // Find SPP category (INCOME type)
    const sppCategory = await prisma.category.findFirst({
      where: { name: "SPP", type: "INCOME" },
    });

    const result = await prisma.$transaction(async (tx) => {
      let invoice;
      if (existing) {
        invoice = await tx.invoice.update({
          where: { id: existing.id },
          data: { status: "PAID" },
        });
      } else {
        invoice = await tx.invoice.create({
          data: {
            studentId: student.id,
            invoiceType: "SPP",
            month: Number(month),
            year: Number(year),
            baseAmount,
            discountApplied,
            amount: netAmount,
            status: "PAID",
          },
        });
      }

      const transaction = await tx.transaction.create({
        data: {
          type: "INCOME",
          categoryId: sppCategory?.id ?? 1,
          paymentMethod: "CASH",
          amount: netAmount,
          description: `Pembayaran SPP tunai bulan ${month} tahun ${year} untuk siswa ${student.name}`,
          schoolUnitId: student.schoolUnitId,
          recordedById: authResult.id,
          invoiceId: invoice.id,
        },
      });

      return { invoice, transaction };
    });

    return NextResponse.json({
      success: true,
      message: "Pembayaran tunai SPP offline berhasil diproses",
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
