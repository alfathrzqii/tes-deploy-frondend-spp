import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (isAuthError(authResult)) return authResult;

  if (
    authResult.role !== "SUPER_ADMIN" &&
    authResult.role !== "UNIT_ADMIN" &&
    authResult.role !== "WALI_KELAS"
  ) {
    return NextResponse.json(
      { success: false, message: "Akses ditolak" },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year")
      ? Number(searchParams.get("year"))
      : new Date().getFullYear();
    const upToMonth = searchParams.get("upToMonth")
      ? Number(searchParams.get("upToMonth"))
      : new Date().getMonth() + 1; // Default to current month

    let schoolUnitId = searchParams.get("schoolUnitId")
      ? Number(searchParams.get("schoolUnitId"))
      : undefined;
    let className = searchParams.get("className") || undefined;

    // Role-based boundary isolation
    if (authResult.role === "WALI_KELAS") {
      schoolUnitId = authResult.schoolUnitId ?? undefined;
      className = authResult.className ?? undefined;
    } else if (authResult.role === "UNIT_ADMIN") {
      schoolUnitId = authResult.schoolUnitId ?? undefined;
    }

    // 1. Fetch matching students
    const whereClause: any = {};
    if (schoolUnitId) whereClause.schoolUnitId = schoolUnitId;
    if (className) whereClause.className = className;

    const students = await prisma.student.findMany({
      where: whereClause,
      include: {
        parent: { select: { name: true, phoneNumber: true, email: true } },
        schoolUnit: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });

    // 2. Fetch tariffs and group by schoolUnitId + enrollmentYear
    const tariffs = await prisma.sppTariff.findMany({});

    // 3. For each student, check which months are unpaid up to upToMonth
    const unpaidList = [];
    let grandTotalUnpaidAmount = 0;
    let grandTotalUnpaidMonthsCount = 0;

    for (const student of students) {
      // Find matching tariff
      const tariff = tariffs.find(
        (t) =>
          t.schoolUnitId === student.schoolUnitId &&
          t.enrollmentYear === student.enrollmentYear
      );

      if (!tariff) {
        // Skip students without configured tariffs
        continue;
      }

      const baseAmount = tariff.amount;
      const discountApplied = Math.floor((baseAmount * student.discountPercentage) / 100);
      const netAmount = baseAmount - discountApplied;

      // Fetch all invoices for this student in the target year
      const dbInvoices = await prisma.invoice.findMany({
        where: { studentId: student.id, year },
        include: {
          transactions: {
            where: { type: "INCOME" },
          },
        },
      });

      const studentUnpaidMonths = [];
      let studentTotalUnpaidAmount = 0;

      // Check each month up to target month
      for (let m = 1; m <= upToMonth; m++) {
        const inv = dbInvoices.find((i) => i.month === m && i.invoiceType === "SPP");

        if (!inv) {
          // No invoice record implies PENDING (100% unpaid)
          studentUnpaidMonths.push({
            month: m,
            status: "PENDING",
            totalAmount: netAmount,
            unpaidAmount: netAmount,
          });
          studentTotalUnpaidAmount += netAmount;
        } else if (inv.status === "PENDING") {
          studentUnpaidMonths.push({
            month: m,
            status: "PENDING",
            totalAmount: inv.amount,
            unpaidAmount: inv.amount,
          });
          studentTotalUnpaidAmount += inv.amount;
        } else if (inv.status === "PARTIALLY_PAID") {
          // Sum paid amounts
          const totalPaid = inv.transactions.reduce((sum, tx) => sum + tx.amount, 0);
          const unpaid = Math.max(0, inv.amount - totalPaid);
          if (unpaid > 0) {
            studentUnpaidMonths.push({
              month: m,
              status: "PARTIALLY_PAID",
              totalAmount: inv.amount,
              unpaidAmount: unpaid,
            });
            studentTotalUnpaidAmount += unpaid;
          }
        }
        // If inv.status === 'PAID', it's fully paid, so skip
      }

      if (studentUnpaidMonths.length > 0) {
        unpaidList.push({
          id: student.id,
          studentNumber: student.studentNumber,
          name: student.name,
          className: student.className,
          schoolUnitId: student.schoolUnitId,
          schoolUnitName: student.schoolUnit?.name || `Unit ${student.schoolUnitId}`,
          parentName: student.parent.name,
          parentPhoneNumber: student.parent.phoneNumber,
          parentEmail: student.parent.email,
          unpaidMonths: studentUnpaidMonths,
          totalUnpaidAmount: studentTotalUnpaidAmount,
          totalUnpaidCount: studentUnpaidMonths.length,
        });

        grandTotalUnpaidAmount += studentTotalUnpaidAmount;
        grandTotalUnpaidMonthsCount += studentUnpaidMonths.length;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Daftar tunggakan SPP berhasil diambil",
      data: {
        unpaidList,
        summary: {
          grandTotalUnpaidAmount,
          grandTotalUnpaidMonthsCount,
          totalStudentsCount: students.length,
          totalStudentsUnpaidCount: unpaidList.length,
        },
      },
    });
  } catch (error) {
    console.error("[INVOICES UNPAID GET]", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
