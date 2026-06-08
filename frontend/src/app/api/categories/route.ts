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
    const where: any = {};
    if (authResult.role === "UNIT_ADMIN") {
      // UNIT_ADMIN sees global categories + their own unit's categories
      where.OR = [
        { schoolUnitId: null },
        { schoolUnitId: authResult.schoolUnitId },
      ];
    }

    const categories = await prisma.category.findMany({ where });

    return NextResponse.json({
      success: true,
      message: "Daftar kategori keuangan berhasil diambil",
      data: categories,
    });
  } catch (error) {
    console.error("[CATEGORIES GET]", error);
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
    let { name, type, schoolUnitId } = await req.json();

    // UNIT_ADMIN can only create categories for their own unit
    if (authResult.role === "UNIT_ADMIN") {
      schoolUnitId = authResult.schoolUnitId;
    }

    const category = await prisma.category.create({
      data: {
        name,
        type,
        schoolUnitId: schoolUnitId || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Kategori keuangan berhasil ditambahkan",
        data: category,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[CATEGORIES POST]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan server" },
      { status: 400 }
    );
  }
}
