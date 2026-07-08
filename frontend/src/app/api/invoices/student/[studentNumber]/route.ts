import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentNumber: string }> }
) {
  const authResult = await requireAuth(req);
  if (isAuthError(authResult)) {
    return NextResponse.json(
      { success: false, message: "Autentikasi diperlukan. Silakan login terlebih dahulu" },
      { status: 401 }
    );
  }

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
      include: {
        schoolUnit: { select: { name: true } },
        parent: { select: { name: true, email: true } },
      },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Siswa tidak ditemukan" },
        { status: 404 }
      );
    }

    // Role-based authorization boundaries
    if (authResult.role === "PARENT") {
      if (student.parentId !== authResult.id) {
        return NextResponse.json(
          { success: false, message: "Akses ditolak: Anda hanya diizinkan melihat tagihan anak Anda sendiri" },
          { status: 403 }
        );
      }
    } else if (authResult.role === "WALI_KELAS") {
      if (
        student.schoolUnitId !== authResult.schoolUnitId ||
        student.className !== authResult.className
      ) {
        return NextResponse.json(
          { success: false, message: "Akses ditolak: Anda hanya diizinkan melihat tagihan siswa kelas bimbingan Anda" },
          { status: 403 }
        );
      }
    } else if (authResult.role === "UNIT_ADMIN") {
      if (student.schoolUnitId !== authResult.schoolUnitId) {
        return NextResponse.json(
          { success: false, message: "Akses ditolak: Anda hanya diizinkan melihat tagihan siswa unit sekolah Anda" },
          { status: 403 }
        );
      }
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
      include: {
        transactions: {
          where: { type: "INCOME" },
        },
      },
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
      allInvoices: dbInvoices,
      student,
    });
  } catch (error) {
    console.error("[INVOICES STUDENT GET]", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
