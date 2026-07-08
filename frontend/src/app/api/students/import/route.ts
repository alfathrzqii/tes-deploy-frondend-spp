import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth";
import bcrypt from "bcryptjs";

// Helper function to format student birthdate into default parent password string
function formatBirthDateToPassword(birthDate: string): string {
  if (!birthDate) return "parent123";
  const clean = birthDate.trim();
  
  if (clean.includes("-")) {
    const parts = clean.split("-");
    if (parts[0].length === 4) {
      return `${parts[2]}${parts[1]}${parts[0]}`; // YYYY-MM-DD -> DDMMYYYY
    }
    return parts.join(""); // DD-MM-YYYY -> DDMMYYYY
  }
  
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

// Map unit string to unit ID
function getUnitIdByName(name: string): number {
  const clean = name.trim().toUpperCase();
  if (clean.includes("KB")) return 1;
  if (clean.includes("RA")) return 2;
  if (clean.includes("SD")) return 3;
  if (clean.includes("TPA")) return 4;
  return 3; // default SD
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
    const { rows } = await req.json();

    if (!rows || !Array.isArray(rows)) {
      return NextResponse.json(
        { success: false, message: "Format data tidak valid. Wajib menyertakan array data siswa." },
        { status: 400 }
      );
    }

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Process each student row
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      try {
        const studentNumber = (row.nis || row.studentNumber || "").toString().trim();
        const name = (row.nama || row.name || "").toString().trim();
        const className = (row.kelas || row.className || "N/A").toString().trim();
        const unitName = (row.unit || row.schoolUnitName || "SD").toString().trim();
        const enrollmentYearStr = (row.angkatan || row.enrollmentYear || new Date().getFullYear()).toString().trim();
        const discountStr = (row.diskon || row.discountPercentage || "0").toString().trim();
        const birthDate = (row.tanggal_lahir || row.birthDate || "").toString().trim();
        const parentName = (row.nama_ortu || row.parentName || `Wali dari ${name}`).toString().trim();
        const parentPhoneNumber = (row.hp_ortu || row.parentPhoneNumber || "").toString().trim();
        const parentEmail = (row.email_ortu || row.parentEmail || "").toString().trim();

        if (!studentNumber || !name || !parentPhoneNumber) {
          throw new Error("NIS, Nama Siswa, dan No HP Wali wajib diisi");
        }

        const schoolUnitId = getUnitIdByName(unitName);
        const enrollmentYear = Number(enrollmentYearStr) || new Date().getFullYear();
        const discountPercentage = Number(discountStr) || 0;

        // UNIT_ADMIN boundary check
        if (authResult.role === "UNIT_ADMIN" && schoolUnitId !== authResult.schoolUnitId) {
          throw new Error(`Akses ditolak: Baris ${index + 1} berada pada unit yang berbeda dari kewenangan Anda`);
        }

        await prisma.$transaction(async (tx) => {
          // Find or create parent
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

          // Upsert student locked by studentNumber (NIS)
          const existingStudent = await tx.student.findUnique({
            where: { studentNumber },
          });

          if (existingStudent) {
            await tx.student.update({
              where: { studentNumber },
              data: {
                name,
                className,
                schoolUnitId,
                enrollmentYear,
                discountPercentage,
                birthDate: birthDate || null,
                parentId: parentUser.id,
              },
            });
          } else {
            await tx.student.create({
              data: {
                studentNumber,
                name,
                className,
                schoolUnitId,
                enrollmentYear,
                discountPercentage,
                birthDate: birthDate || null,
                parentId: parentUser.id,
              },
            });
          }
        });

        successCount++;
      } catch (err: any) {
        failedCount++;
        errors.push(`Baris ${index + 1}: ${err.message || "Kesalahan tidak diketahui"}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import CSV selesai. Berhasil: ${successCount}, Gagal: ${failedCount}`,
      data: {
        successCount,
        failedCount,
        errors,
      },
    });
  } catch (error: any) {
    console.error("[STUDENTS IMPORT POST]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
