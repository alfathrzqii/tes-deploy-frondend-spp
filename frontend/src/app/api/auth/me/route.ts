import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (isAuthError(authResult)) return authResult;

  try {
    const user = await prisma.user.findUnique({
      where: { id: authResult.id },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Autentikasi gagal: Sesi tidak valid atau telah berakhir",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Sesi pengguna aktif",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        schoolUnitId: user.schoolUnitId,
      },
    });
  } catch (error) {
    console.error("[AUTH ME]", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
