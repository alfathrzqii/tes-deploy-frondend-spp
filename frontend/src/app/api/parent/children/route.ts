import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (isAuthError(authResult)) return authResult;

  if (authResult.role !== "PARENT") {
    return NextResponse.json(
      { success: false, message: "Akses khusus wali murid" },
      { status: 403 }
    );
  }

  try {
    const children = await prisma.student.findMany({
      where: { parentId: authResult.id },
      include: {
        schoolUnit: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      message: "Data anak berhasil diambil",
      data: children,
    });
  } catch (error) {
    console.error("[PARENT CHILDREN GET]", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
