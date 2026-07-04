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
    const { name, className, discountPercentage } = await req.json();

    // Check UNIT_ADMIN access
    if (authResult.role === "UNIT_ADMIN") {
      const existing = await prisma.student.findUnique({
        where: { id: Number(id) },
      });
      if (!existing || existing.schoolUnitId !== authResult.schoolUnitId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Akses ditolak: Anda tidak memiliki otoritas untuk mengelola siswa ini",
          },
          { status: 403 }
        );
      }
    }

    const student = await prisma.student.update({
      where: { id: Number(id) },
      data: {
        name,
        className,
        discountPercentage: Number(discountPercentage),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Data siswa berhasil diperbarui",
      data: student,
    });
  } catch (error: any) {
    console.error("[STUDENTS PUT]", error);
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

    // Check UNIT_ADMIN access
    if (authResult.role === "UNIT_ADMIN") {
      const existing = await prisma.student.findUnique({
        where: { id: Number(id) },
      });
      if (!existing || existing.schoolUnitId !== authResult.schoolUnitId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Akses ditolak: Anda tidak memiliki otoritas untuk menghapus siswa ini",
          },
          { status: 403 }
        );
      }
    }

    await prisma.student.delete({ where: { id: Number(id) } });

    return NextResponse.json({
      success: true,
      message: "Data siswa berhasil dihapus",
    });
  } catch (error: any) {
    console.error("[STUDENTS DELETE]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan server" },
      { status: 400 }
    );
  }
}
