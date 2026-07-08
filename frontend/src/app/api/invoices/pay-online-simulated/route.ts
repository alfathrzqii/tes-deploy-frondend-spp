import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (isAuthError(authResult)) {
    return NextResponse.json(
      { success: false, message: "Autentikasi diperlukan. Silakan login terlebih dahulu" },
      { status: 401 }
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

    // Role-based boundary check for simulated payment
    if (authResult.role === "PARENT") {
      if (student.parentId !== authResult.id) {
        return NextResponse.json(
          { success: false, message: "Akses ditolak: Anda hanya diizinkan membayar tagihan anak Anda sendiri" },
          { status: 403 }
        );
      }
    } else if (authResult.role === "WALI_KELAS") {
      if (
        student.schoolUnitId !== authResult.schoolUnitId ||
        student.className !== authResult.className
      ) {
        return NextResponse.json(
          { success: false, message: "Akses ditolak: Anda hanya diizinkan memproses tagihan siswa kelas bimbingan Anda" },
          { status: 403 }
        );
      }
    } else if (authResult.role === "UNIT_ADMIN") {
      if (student.schoolUnitId !== authResult.schoolUnitId) {
        return NextResponse.json(
          { success: false, message: "Akses ditolak: Anda hanya diizinkan memproses tagihan siswa unit sekolah Anda" },
          { status: 403 }
        );
      }
    }

    // Check if already paid
    const existingInvoice = await prisma.invoice.findUnique({
      where: {
        uq_student_billing_period: {
          studentId: student.id,
          month: Number(month),
          year: Number(year),
          invoiceType: "SPP",
        },
      },
    });

    if (existingInvoice && existingInvoice.status === "PAID") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Gagal: Tagihan SPP siswa untuk bulan dan tahun tersebut sudah lunas",
        },
        { status: 400 }
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
    const amountToPay = baseAmount - discountApplied;

    const mockOrderId = `MOCK-MIDTRANS-${Date.now()}`;

    const result = await prisma.$transaction(async (tx) => {
      let invoice;
      if (existingInvoice) {
        invoice = await tx.invoice.update({
          where: { id: existingInvoice.id },
          data: {
            status: "PAID",
            midtransOrderId:
              existingInvoice.midtransOrderId || mockOrderId,
          },
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
            amount: amountToPay,
            status: "PAID",
            midtransOrderId: mockOrderId,
          },
        });
      }

      const transaction = await tx.transaction.create({
        data: {
          type: "INCOME",
          categoryId: 1, // SPP category
          paymentMethod: "MIDTRANS",
          amount: amountToPay,
          description: `Pembayaran SPP online (simulasi Midtrans) bulan ${month} tahun ${year} untuk siswa ${student.name}`,
          schoolUnitId: student.schoolUnitId,
          recordedById: null,
          invoiceId: invoice.id,
        },
      });

      return { invoice, transaction };
    });

    return NextResponse.json({
      success: true,
      message: "Simulasi pembayaran online SPP (Midtrans) berhasil diproses",
      data: {
        invoiceId: result.invoice.id,
        studentId: result.invoice.studentId,
        month: result.invoice.month,
        year: result.invoice.year,
        amountPaid: result.transaction.amount,
        transactionId: result.transaction.id,
        midtransOrderId: result.invoice.midtransOrderId,
      },
    });
  } catch (error: any) {
    console.error("[INVOICES PAY-ONLINE-SIMULATED POST]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan server" },
      { status: 400 }
    );
  }
}
