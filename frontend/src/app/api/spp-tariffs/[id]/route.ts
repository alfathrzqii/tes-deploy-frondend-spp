import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(req);
  if (isAuthError(authResult)) return authResult;

  if (authResult.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { success: false, message: "Akses ditolak: Hanya Super Admin" },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const { amount } = await req.json();

    const tariff = await prisma.sppTariff.update({
      where: { id: Number(id) },
      data: { amount: Number(amount) },
    });

    return NextResponse.json({
      success: true,
      message: "Tarif SPP berhasil diperbarui",
      data: tariff,
    });
  } catch (error: any) {
    console.error("[SPP-TARIFFS PUT]", error);
    if (error.code === "P2025") {
      return NextResponse.json(
        { success: false, message: "Tarif SPP tidak ditemukan" },
        { status: 404 }
      );
    }
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

  if (authResult.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { success: false, message: "Akses ditolak: Hanya Super Admin" },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;

    await prisma.sppTariff.delete({ where: { id: Number(id) } });

    return NextResponse.json({
      success: true,
      message: "Tarif SPP berhasil dihapus",
    });
  } catch (error: any) {
    console.error("[SPP-TARIFFS DELETE]", error);
    if (error.code === "P2025") {
      return NextResponse.json(
        { success: false, message: "Tarif SPP tidak ditemukan" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan server" },
      { status: 400 }
    );
  }
}
