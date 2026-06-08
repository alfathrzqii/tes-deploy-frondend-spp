import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentNumber: string }> }
) {
  try {
    const { studentNumber } = await params;
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year")
      ? Number(searchParams.get("year"))
      : new Date().getFullYear();

    if (!studentNumber) {
      return NextResponse.json(
        { success: false, message: "NIS siswa harus disertakan" },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { studentNumber },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Siswa tidak ditemukan" },
        { status: 404 }
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
            "Master tarif SPP untuk angkatan siswa ini belum dikonfigurasi",
        },
        { status: 400 }
      );
    }

    const baseAmount = tariff.amount;
    const discountApplied = Math.floor(
      (baseAmount * student.discountPercentage) / 100
    );
    const netAmount = baseAmount - discountApplied;

    // Fetch existing invoices from DB
    const dbInvoices = await prisma.invoice.findMany({
      where: { studentId: student.id, year },
      orderBy: { month: "asc" },
    });

    // Construct 12 months (1 to 12)
    const invoices = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const existing = dbInvoices.find(
        (inv) => inv.month === month && inv.invoiceType === "SPP"
      );
      if (existing) {
        return existing;
      }
      return {
        id: null,
        studentId: student.id,
        invoiceType: "SPP",
        month,
        year,
        baseAmount,
        discountApplied,
        amount: netAmount,
        status: "PENDING",
        midtransOrderId: null,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Daftar invoice SPP siswa berhasil diambil",
      data: invoices,
    });
  } catch (error) {
    console.error("[INVOICES STUDENT GET]", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
