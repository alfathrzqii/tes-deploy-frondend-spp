import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth";
import bcrypt from "bcryptjs";

// Helper function to format student birthdate into default parent password string
function formatBirthDateToPassword(birthDate: string): string {
  if (!birthDate) return "parent123";
  const clean = birthDate.trim();
  
  // YYYY-MM-DD -> DDMMYYYY
  if (clean.includes("-")) {
    const parts = clean.split("-");
    if (parts[0].length === 4) {
      return `${parts[2]}${parts[1]}${parts[0]}`;
    }
    return parts.join("");
  }
  
  // DD/MM/YYYY or YYYY/MM/DD -> DDMMYYYY
  if (clean.includes("/")) {
    const parts = clean.split("/");
    if (parts[2].length === 4) {
      return `${parts[0]}${parts[1]}${parts[2]}`;
    } else if (parts[0].length === 4) {
      return `${parts[2]}${parts[1]}${parts[0]}`;
    }
  }
  
  return clean.replace(/[^0-9]/g, "") || "parent123";
}

export async function GET(req: NextRequest) {
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
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    let schoolUnitId = searchParams.get("schoolUnitId")
      ? Number(searchParams.get("schoolUnitId"))
      : undefined;
    let className = searchParams.get("className") || undefined;

    // Wali Kelas can only see their own unit & class
    if (authResult.role === "WALI_KELAS") {
      schoolUnitId = authResult.schoolUnitId ?? undefined;
      className = authResult.className ?? undefined;
    } else if (authResult.role === "UNIT_ADMIN") {
      // UNIT_ADMIN can only see their own unit
      schoolUnitId = authResult.schoolUnitId ?? undefined;
    }

    const where: any = {};
    if (schoolUnitId) where.schoolUnitId = schoolUnitId;
    if (className) where.className = className;
    if (search) {
      const isPostgres = process.env.DATABASE_URL?.startsWith("postgres") || process.env.DATABASE_URL?.startsWith("postgresql");
      const filterMode = isPostgres ? { mode: "insensitive" as const } : {};
      where.OR = [
        { name: { contains: search, ...filterMode } },
        { studentNumber: { contains: search, ...filterMode } },
      ];
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        parent: { select: { name: true, email: true, phoneNumber: true } },
        schoolUnit: { select: { name: true } },
      },
      orderBy: { name: "asc" },
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
    const {
      studentNumber,
      name,
      className,
      schoolUnitId,
      enrollmentYear,
      discountPercentage,
      birthDate,
      parentName,
      parentEmail,
      parentPhoneNumber,
    } = await req.json();

    if (!studentNumber || !name || !parentName || !parentPhoneNumber) {
      return NextResponse.json(
        { success: false, message: "NIS, Nama Siswa, Nama Wali, dan No HP Wali wajib diisi" },
        { status: 400 }
      );
    }

    // Role-based boundary isolation
    if (authResult.role === "UNIT_ADMIN" && Number(schoolUnitId) !== authResult.schoolUnitId) {
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
      (Number(schoolUnitId) !== authResult.schoolUnitId || className !== authResult.className)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Akses ditolak: Anda hanya diizinkan untuk mendaftarkan siswa di kelas bimbingan Anda sendiri",
        },
        { status: 403 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Find or create parent based on unique phone number
      let parentUser = await tx.user.findUnique({
        where: { phoneNumber: parentPhoneNumber },
      });

      if (!parentUser) {
        const defaultPassword = formatBirthDateToPassword(birthDate);
        const passwordHash = await bcrypt.hash(defaultPassword, 10);

        parentUser = await tx.user.create({
          data: {
            name: parentName,
            email: parentEmail || null,
            phoneNumber: parentPhoneNumber,
            password: passwordHash,
            role: "PARENT",
            schoolUnitId: null,
          },
        });
      }

      // Check if student with NIS (studentNumber) already exists (NIS lock upsert)
      const existingStudent = await tx.student.findUnique({
        where: { studentNumber },
      });

      let student;
      if (existingStudent) {
        // Promotion or update class / details
        student = await tx.student.update({
          where: { studentNumber },
          data: {
            name,
            className: className || "N/A",
            schoolUnitId: Number(schoolUnitId),
            enrollmentYear: Number(enrollmentYear),
            discountPercentage: Number(discountPercentage ?? 0),
            birthDate: birthDate || null,
            parentId: parentUser.id,
          },
        });
      } else {
        // Create new student
        student = await tx.student.create({
          data: {
            studentNumber,
            name,
            className: className || "N/A",
            schoolUnitId: Number(schoolUnitId),
            enrollmentYear: Number(enrollmentYear),
            discountPercentage: Number(discountPercentage ?? 0),
            birthDate: birthDate || null,
            parentId: parentUser.id,
          },
        });
      }

      return student;
    });

    return NextResponse.json(
      {
        success: true,
        message: "Data siswa dan akun orang tua berhasil didaftarkan / diperbarui",
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
