import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth";
import bcrypt from "bcrypt";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (isAuthError(authResult)) return authResult;

  // UNIT_ADMIN can only see their own unit's students
  if (
    authResult.role !== "SUPER_ADMIN" &&
    authResult.role !== "UNIT_ADMIN"
  ) {
    return NextResponse.json(
      { success: false, message: "Akses ditolak" },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    let schoolUnitId = searchParams.get("schoolUnitId")
      ? Number(searchParams.get("schoolUnitId"))
      : undefined;

    // UNIT_ADMIN can only see their own unit
    if (authResult.role === "UNIT_ADMIN") {
      schoolUnitId = authResult.schoolUnitId ?? undefined;
    }

    const where: any = {};
    if (schoolUnitId) where.schoolUnitId = schoolUnitId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { studentNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        parent: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Daftar data siswa berhasil diambil",
      data: students,
    });
  } catch (error) {
    console.error("[STUDENTS GET]", error);
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
    const {
      studentNumber,
      name,
      schoolUnitId,
      enrollmentYear,
      discountPercentage,
      parentName,
      parentEmail,
    } = await req.json();

    // UNIT_ADMIN isolation
    if (
      authResult.role === "UNIT_ADMIN" &&
      schoolUnitId !== authResult.schoolUnitId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Akses ditolak: Anda tidak memiliki otoritas untuk mendaftarkan siswa di unit sekolah ini",
        },
        { status: 403 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const passwordHash = await bcrypt.hash(parentEmail, 10);

      const newUser = await tx.user.create({
        data: {
          name: parentName,
          email: parentEmail,
          password: passwordHash,
          role: "PARENT",
          schoolUnitId: null,
        },
      });

      const newStudent = await tx.student.create({
        data: {
          studentNumber,
          name,
          schoolUnitId: Number(schoolUnitId),
          enrollmentYear: Number(enrollmentYear),
          discountPercentage: Number(discountPercentage ?? 0),
          parentId: newUser.id,
        },
      });

      return newStudent;
    });

    return NextResponse.json(
      {
        success: true,
        message: "Data siswa dan akun orang tua berhasil didaftarkan",
        data: result,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[STUDENTS POST]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan server" },
      { status: 400 }
    );
  }
}
