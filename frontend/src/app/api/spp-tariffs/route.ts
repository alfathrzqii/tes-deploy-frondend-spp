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
    const schoolUnitIdParam = searchParams.get("schoolUnitId");

    const where: any = {};
    if (schoolUnitIdParam) {
      where.schoolUnitId = Number(schoolUnitIdParam);
    }

    const tariffs = await prisma.sppTariff.findMany({ where });

    return NextResponse.json({
      success: true,
      message: "Daftar tarif SPP berhasil diambil",
      data: tariffs,
    });
  } catch (error) {
    console.error("[SPP-TARIFFS GET]", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (isAuthError(authResult)) return authResult;

  if (authResult.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { success: false, message: "Akses ditolak: Hanya Super Admin" },
      { status: 403 }
    );
  }

  try {
    const { schoolUnitId, enrollmentYear, amount } = await req.json();

    const tariff = await prisma.sppTariff.create({
      data: {
        schoolUnitId: Number(schoolUnitId),
        enrollmentYear: Number(enrollmentYear),
        amount: Number(amount),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Tarif SPP berhasil ditambahkan",
        data: tariff,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[SPP-TARIFFS POST]", error);
    // Unique constraint violation
    if (error.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Gagal: Tarif SPP untuk unit dan angkatan tersebut sudah terdaftar",
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan server" },
      { status: 400 }
    );
  }
}
