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
      : new Date().getMonth() + 1;

    let schoolUnitId = searchParams.get("schoolUnitId")
      ? Number(searchParams.get("schoolUnitId"))
      : undefined;

    // Role-based boundary isolation
    if (authResult.role === "WALI_KELAS") {
      schoolUnitId = authResult.schoolUnitId ?? undefined;
    } else if (authResult.role === "UNIT_ADMIN") {
      schoolUnitId = authResult.schoolUnitId ?? undefined;
    }

    // 1. Get total students count grouped by class and unit
    const groupWhere: any = {};
    if (schoolUnitId) groupWhere.schoolUnitId = schoolUnitId;
    if (authResult.role === "WALI_KELAS") {
      groupWhere.className = authResult.className;
    }

    const classCounts = await prisma.student.groupBy({
      by: ["className", "schoolUnitId"],
      where: groupWhere,
      _count: { id: true },
    });

    // Fetch school units to look up unit name
    const schoolUnits = await prisma.schoolUnit.findMany({});

    // 2. Fetch all matching students to check unpaid SPP (using identical logic)
    const students = await prisma.student.findMany({
      where: groupWhere,
      include: { schoolUnit: true },
    });

    const tariffs = await prisma.sppTariff.findMany({});
    
    // Group totals by className + schoolUnitId
    const recapMap = new Map<string, {
      className: string;
      schoolUnitId: number;
      schoolUnitName: string;
      totalStudents: number;
      unpaidStudentsCount: number;
      totalUnpaidMonths: number;
      totalUnpaidAmount: number;
    }>();

    // Initialize map with all existing classes in selection
    for (const group of classCounts) {
      const unit = schoolUnits.find(u => u.id === group.schoolUnitId);
      const key = `${group.schoolUnitId}-${group.className}`;
      recapMap.set(key, {
        className: group.className,
        schoolUnitId: group.schoolUnitId,
        schoolUnitName: unit?.name || `Unit ${group.schoolUnitId}`,
        totalStudents: group._count.id,
        unpaidStudentsCount: 0,
        totalUnpaidMonths: 0,
        totalUnpaidAmount: 0,
      });
    }

    // Check unpaid for each student
    for (const student of students) {
      const tariff = tariffs.find(
        (t) =>
          t.schoolUnitId === student.schoolUnitId &&
          t.enrollmentYear === student.enrollmentYear
      );

      if (!tariff) continue;

      const baseAmount = tariff.amount;
      const discountApplied = Math.floor((baseAmount * student.discountPercentage) / 100);
      const netAmount = baseAmount - discountApplied;

      const dbInvoices = await prisma.invoice.findMany({
        where: { studentId: student.id, year, invoiceType: "SPP" },
        include: {
          transactions: { where: { type: "INCOME" } },
        },
      });

      let studentUnpaidMonths = 0;
      let studentUnpaidAmount = 0;

      for (let m = 1; m <= upToMonth; m++) {
        const inv = dbInvoices.find(i => i.month === m);
        if (!inv) {
          studentUnpaidMonths++;
          studentUnpaidAmount += netAmount;
        } else if (inv.status === "PENDING") {
          studentUnpaidMonths++;
          studentUnpaidAmount += inv.amount;
        } else if (inv.status === "PARTIALLY_PAID") {
          const totalPaid = inv.transactions.reduce((sum, tx) => sum + tx.amount, 0);
          const unpaid = Math.max(0, inv.amount - totalPaid);
          if (unpaid > 0) {
            studentUnpaidMonths++;
            studentUnpaidAmount += unpaid;
          }
        }
      }

      if (studentUnpaidMonths > 0) {
        const key = `${student.schoolUnitId}-${student.className}`;
        const currentRecap = recapMap.get(key);
        if (currentRecap) {
          currentRecap.unpaidStudentsCount++;
          currentRecap.totalUnpaidMonths += studentUnpaidMonths;
          currentRecap.totalUnpaidAmount += studentUnpaidAmount;
        }
      }
    }

    const recapList = Array.from(recapMap.values()).sort((a, b) => 
      a.schoolUnitId !== b.schoolUnitId 
        ? a.schoolUnitId - b.schoolUnitId 
        : a.className.localeCompare(b.className)
    );

    return NextResponse.json({
      success: true,
      message: "Rekap SPP kelas berhasil diambil",
      data: recapList,
    });
  } catch (error) {
    console.error("[CLASS RECAP GET]", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
