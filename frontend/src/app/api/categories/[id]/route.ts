import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(req);
  if (isAuthError(authResult)) return authResult;

  if (authResult.role !== "SUPER_ADMIN" && authResult.role !== "UNIT_ADMIN") {
    return NextResponse.json(
      { success: false, message: "Akses ditolak" },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const categoryId = Number(id);
    const { name, type } = await req.json();

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Kategori tidak ditemukan" },
        { status: 404 }
      );
    }

    // UNIT_ADMIN can only update their own unit's categories
    if (
      authResult.role === "UNIT_ADMIN" &&
      category.schoolUnitId !== authResult.schoolUnitId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Akses ditolak: Anda tidak memiliki otoritas untuk mengelola kategori ini",
        },
        { status: 403 }
      );
    }

    const updated = await prisma.category.update({
      where: { id: categoryId },
      data: { name, type },
    });

    return NextResponse.json({
      success: true,
      message: "Kategori keuangan berhasil diperbarui",
      data: updated,
    });
  } catch (error: any) {
    console.error("[CATEGORIES PUT]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan server" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(req);
  if (isAuthError(authResult)) return authResult;

  if (authResult.role !== "SUPER_ADMIN" && authResult.role !== "UNIT_ADMIN") {
    return NextResponse.json(
      { success: false, message: "Akses ditolak" },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const categoryId = Number(id);

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Kategori tidak ditemukan" },
        { status: 404 }
      );
    }

    // UNIT_ADMIN can only delete their own unit's categories
    if (
      authResult.role === "UNIT_ADMIN" &&
      category.schoolUnitId !== authResult.schoolUnitId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Akses ditolak: Anda tidak memiliki otoritas untuk mengelola kategori ini",
        },
        { status: 403 }
      );
    }

    await prisma.category.delete({ where: { id: categoryId } });

    return NextResponse.json({
      success: true,
      message: "Kategori keuangan berhasil dihapus",
    });
  } catch (error: any) {
    console.error("[CATEGORIES DELETE]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan server" },
      { status: 400 }
    );
  }
}
