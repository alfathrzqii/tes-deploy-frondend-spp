import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (isAuthError(authResult)) return authResult;

  // Only SUPER_ADMIN can manage all users
  if (authResult.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { success: false, message: "Akses ditolak" },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const roleFilter = searchParams.get("role") || undefined;

    const where: any = {};
    if (roleFilter) where.role = roleFilter;

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        role: true,
        schoolUnitId: true,
        className: true,
        schoolUnit: {
          select: { name: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      message: "Daftar pengguna berhasil diambil",
      data: users,
    });
  } catch (error) {
    console.error("[USERS GET]", error);
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
      { success: false, message: "Akses ditolak" },
      { status: 403 }
    );
  }

  try {
    const {
      name,
      email,
      phoneNumber,
      password,
      role,
      schoolUnitId,
      className,
    } = await req.json();

    if (!name || !phoneNumber || !password || !role) {
      return NextResponse.json(
        { success: false, message: "Nama, No HP, Password, dan Peran wajib diisi" },
        { status: 400 }
      );
    }

    // Check if phone number already registered
    const existing = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "Nomor HP sudah digunakan oleh akun lain" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email: email || null,
        phoneNumber,
        password: passwordHash,
        role,
        schoolUnitId: schoolUnitId ? Number(schoolUnitId) : null,
        className: role === "WALI_KELAS" ? className : null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Akun pengguna baru berhasil dibuat",
        data: {
          id: newUser.id,
          name: newUser.name,
          phoneNumber: newUser.phoneNumber,
          role: newUser.role,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[USERS POST]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
