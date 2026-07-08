import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;
    const { name, className, discountPercentage, birthDate } = await req.json();

    const existing = await prisma.student.findUnique({
      where: { id: Number(id) },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Siswa tidak ditemukan" },
        { status: 404 }
      );
    }

    // Role-based boundary isolation
    if (authResult.role === "UNIT_ADMIN" && existing.schoolUnitId !== authResult.schoolUnitId) {
      return NextResponse.json(
        {
          success: false,
          message: "Akses ditolak: Anda tidak memiliki otoritas untuk unit sekolah ini",
        },
        { status: 403 }
      );
    }

    if (
      authResult.role === "WALI_KELAS" &&
      (existing.schoolUnitId !== authResult.schoolUnitId || existing.className !== authResult.className)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Akses ditolak: Anda hanya diizinkan untuk mengelola siswa di kelas bimbingan Anda",
        },
        { status: 403 }
      );
    }

    const student = await prisma.student.update({
      where: { id: Number(id) },
      data: {
        name,
        className,
        discountPercentage: Number(discountPercentage),
        birthDate: birthDate !== undefined ? birthDate : existing.birthDate,
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
    const { id } = await params;

    const existing = await prisma.student.findUnique({
      where: { id: Number(id) },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Siswa tidak ditemukan" },
        { status: 404 }
      );
    }

    // Role-based boundary isolation
    if (authResult.role === "UNIT_ADMIN" && existing.schoolUnitId !== authResult.schoolUnitId) {
      return NextResponse.json(
        {
          success: false,
          message: "Akses ditolak: Anda tidak memiliki otoritas untuk unit sekolah ini",
        },
        { status: 403 }
      );
    }

    if (
      authResult.role === "WALI_KELAS" &&
      (existing.schoolUnitId !== authResult.schoolUnitId || existing.className !== authResult.className)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Akses ditolak: Anda hanya diizinkan untuk menghapus siswa di kelas bimbingan Anda",
        },
        { status: 403 }
      );
    }

    // Since SQLite parent reference is RESTRICT, we delete student.
    // If we want to clean up parent accounts too, we check if parent has other students.
    // To keep it simple, we just delete the student record.
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
