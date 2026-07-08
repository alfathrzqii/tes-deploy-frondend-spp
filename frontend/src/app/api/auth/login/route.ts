import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, password } = await req.json();

    if (!phoneNumber || !password) {
      return NextResponse.json(
        { success: false, message: "Nomor HP dan password wajib diisi" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { phoneNumber } });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Nomor HP atau password salah" },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: "Nomor HP atau password salah" },
        { status: 401 }
      );
    }

    const token = signToken({
      id: user.id,
      phoneNumber: user.phoneNumber,
      email: user.email,
      role: user.role,
      schoolUnitId: user.schoolUnitId,
      className: user.className,
    });

    const isProduction = process.env.NODE_ENV === "production";

    const response = NextResponse.json({
      success: true,
      message: "Login berhasil",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        schoolUnitId: user.schoolUnitId,
        className: user.className,
      },
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 24 * 60 * 60, // 1 day in seconds
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("[AUTH LOGIN]", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
