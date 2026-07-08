import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(req);
  if (isAuthError(authResult)) return authResult;

  if (authResult.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { success: false, message: "Akses ditolak" },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const userId = Number(id);
    const {
      name,
      email,
      phoneNumber,
      password,
      role,
      schoolUnitId,
      className,
    } = await req.json();

    const existing = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "User tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check if phone number duplicate
    if (phoneNumber && phoneNumber !== existing.phoneNumber) {
      const dup = await prisma.user.findUnique({ where: { phoneNumber } });
      if (dup) {
        return NextResponse.json(
          { success: false, message: "Nomor HP sudah digunakan oleh akun lain" },
          { status: 400 }
        );
      }
    }

    const data: any = {
      name: name || existing.name,
      email: email !== undefined ? email : existing.email,
      phoneNumber: phoneNumber || existing.phoneNumber,
      role: role || existing.role,
      schoolUnitId: schoolUnitId !== undefined ? (schoolUnitId ? Number(schoolUnitId) : null) : existing.schoolUnitId,
      className: role === "WALI_KELAS" ? (className || existing.className) : null,
    };

    if (password && password.trim().length > 0) {
      data.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
    });

    return NextResponse.json({
      success: true,
      message: "Data pengguna berhasil diperbarui",
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        phoneNumber: updatedUser.phoneNumber,
        role: updatedUser.role,
      },
    });
  } catch (error: any) {
    console.error("[USERS PUT]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(req);
  if (isAuthError(authResult)) return authResult;

  if (authResult.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { success: false, message: "Akses ditolak" },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const userId = Number(id);

    // Prevent self deletion
    if (authResult.id === userId) {
      return NextResponse.json(
        { success: false, message: "Anda tidak diizinkan untuk menghapus akun Anda sendiri" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "User tidak ditemukan" },
        { status: 404 }
      );
    }

    // SQLite constraints: Check if parent user has associated students
    if (existing.role === "PARENT") {
      const studentCount = await prisma.student.count({
        where: { parentId: userId },
      });
      if (studentCount > 0) {
        return NextResponse.json(
          { success: false, message: "Gagal menghapus: Akun wali murid masih terikat dengan data siswa aktif" },
          { status: 400 }
        );
      }
    }

    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({
      success: true,
      message: "Akun pengguna berhasil dihapus",
    });
  } catch (error: any) {
    console.error("[USERS DELETE]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan server" },
      { status: 505 }
    );
  }
}
