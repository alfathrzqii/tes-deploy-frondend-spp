import { PrismaClient, Role, CategoryType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Memulai Proses Seeding Database ===');

  // 1. Hashing Password Default untuk Akun Demo
  const saltRounds = 10;
  const hashPassword = async (password: string) => {
    return await bcrypt.hash(password, saltRounds);
  };

  const defaultPasswordAdmin = await hashPassword('admin123');
  const defaultPasswordParent = await hashPassword('parent123');

  // 2. Seed Data Master: School Units (Unit Sekolah)
  console.log('Seeding data unit sekolah...');
  const unitKB = await prisma.schoolUnit.upsert({
    where: { id: 1 },
    update: { name: 'KB' },
    create: {
      id: 1,
      name: 'KB',
    },
  });

  const unitRA = await prisma.schoolUnit.upsert({
    where: { id: 2 },
    update: { name: 'RA' },
    create: {
      id: 2,
      name: 'RA',
    },
  });

  const unitSD = await prisma.schoolUnit.upsert({
    where: { id: 3 },
    update: { name: 'SD' },
    create: {
      id: 3,
      name: 'SD',
    },
  });

  const unitTPA = await prisma.schoolUnit.upsert({
    where: { id: 4 },
    update: { name: 'TPA' },
    create: {
      id: 4,
      name: 'TPA',
    },
  });

  console.log('Unit sekolah berhasil disiapkan.');

  // 3. Seed Data Master: Users (Pengguna Pengujian dengan nomor hp)
  console.log('Seeding data pengguna default...');

  // Akun Super Admin (Bisa mengelola semua unit - schoolUnitId NULL)
  const superAdmin = await prisma.user.upsert({
    where: { phoneNumber: '0811111111' },
    update: {
      name: 'Super Admin Yayasan',
      password: defaultPasswordAdmin,
      role: Role.SUPER_ADMIN,
      schoolUnitId: null,
      email: 'superadmin@sekolah.sch.id',
    },
    create: {
      name: 'Super Admin Yayasan',
      email: 'superadmin@sekolah.sch.id',
      phoneNumber: '0811111111',
      password: defaultPasswordAdmin,
      role: Role.SUPER_ADMIN,
      schoolUnitId: null,
    },
  });

  // Akun Admin Unit SD (Hanya mengelola unit SD - schoolUnitId: 3)
  const adminSD = await prisma.user.upsert({
    where: { phoneNumber: '0822222222' },
    update: {
      name: 'Admin Keuangan SD',
      password: defaultPasswordAdmin,
      role: Role.UNIT_ADMIN,
      schoolUnitId: unitSD.id,
      email: 'adminsd@sekolah.sch.id',
    },
    create: {
      name: 'Admin Keuangan SD',
      email: 'adminsd@sekolah.sch.id',
      phoneNumber: '0822222222',
      password: defaultPasswordAdmin,
      role: Role.UNIT_ADMIN,
      schoolUnitId: unitSD.id,
    },
  });

  // Akun Wali Kelas 6A (Role WALI_KELAS)
  const waliKelas6A = await prisma.user.upsert({
    where: { phoneNumber: '0833333333' },
    update: {
      name: 'Budi Santoso, S.Pd (Wali Kelas 6A)',
      password: defaultPasswordAdmin,
      role: Role.WALI_KELAS,
      schoolUnitId: unitSD.id,
      className: '6A',
      email: 'walikelas6a@sekolah.sch.id',
    },
    create: {
      name: 'Budi Santoso, S.Pd (Wali Kelas 6A)',
      email: 'walikelas6a@sekolah.sch.id',
      phoneNumber: '0833333333',
      password: defaultPasswordAdmin,
      role: Role.WALI_KELAS,
      schoolUnitId: unitSD.id,
      className: '6A',
    },
  });

  // Akun Orang Tua (Wali Murid - schoolUnitId NULL agar fleksibel multi-unit anak)
  const parent = await prisma.user.upsert({
    where: { phoneNumber: '081234567890' },
    update: {
      name: 'Hendra Wijaya (Wali Murid)',
      password: defaultPasswordParent,
      role: Role.PARENT,
      schoolUnitId: null,
      email: 'parent@test.com',
    },
    create: {
      name: 'Hendra Wijaya (Wali Murid)',
      email: 'parent@test.com',
      phoneNumber: '081234567890',
      password: defaultPasswordParent,
      role: Role.PARENT,
      schoolUnitId: null,
    },
  });

  // Akun Orang Tua Kedua (Wali Rian Hidayat)
  const parentRudi = await prisma.user.upsert({
    where: { phoneNumber: '089999999999' },
    update: {
      name: 'Rudi Hermawan (Wali Rian)',
      password: defaultPasswordParent,
      role: Role.PARENT,
      schoolUnitId: null,
      email: 'rudi@test.com',
    },
    create: {
      name: 'Rudi Hermawan (Wali Rian)',
      email: 'rudi@test.com',
      phoneNumber: '089999999999',
      password: defaultPasswordParent,
      role: Role.PARENT,
      schoolUnitId: null,
    },
  });

  // Akun Orang Tua Ketiga (Wali Dewi Lestari)
  const parentSinta = await prisma.user.upsert({
    where: { phoneNumber: '088888888888' },
    update: {
      name: 'Sinta Lestari (Wali Dewi)',
      password: defaultPasswordParent,
      role: Role.PARENT,
      schoolUnitId: null,
      email: 'sinta@test.com',
    },
    create: {
      name: 'Sinta Lestari (Wali Dewi)',
      email: 'sinta@test.com',
      phoneNumber: '088888888888',
      password: defaultPasswordParent,
      role: Role.PARENT,
      schoolUnitId: null,
    },
  });

  console.log('Data pengguna default berhasil disiapkan.');

  // 4. Seed Data Master: Kategori Transaksi Buku Kas (Categories)
  console.log('Seeding data kategori transaksi keuangan...');
  const defaultCategories = [
    { id: 1, name: 'SPP', type: CategoryType.INCOME, schoolUnitId: null },
    { id: 2, name: 'BOS', type: CategoryType.INCOME, schoolUnitId: 3 }, // SD specific
    { id: 3, name: 'BOP', type: CategoryType.INCOME, schoolUnitId: 1 }, // KB specific (or 2 for RA)
    { id: 4, name: 'Donatur', type: CategoryType.INCOME, schoolUnitId: null },
    { id: 5, name: 'Gaji Guru', type: CategoryType.EXPENSE, schoolUnitId: null },
    { id: 6, name: 'Operasional', type: CategoryType.EXPENSE, schoolUnitId: null },
    { id: 7, name: 'Uang Pengembangan', type: CategoryType.INCOME, schoolUnitId: null },
  ];

  for (const cat of defaultCategories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {
        name: cat.name,
        type: cat.type,
        schoolUnitId: cat.schoolUnitId,
      },
      create: {
        id: cat.id,
        name: cat.name,
        type: cat.type,
        schoolUnitId: cat.schoolUnitId,
      },
    });
  }
  console.log('Kategori transaksi berhasil disiapkan.');

  // 5. Seed Data Master: Tarif SPP per Angkatan (SppTariff)
  console.log('Seeding data tarif dasar SPP angkatan...');
  // SD Angkatan 2024: Rp 150.000 / bulan
  await prisma.sppTariff.upsert({
    where: {
      uq_school_unit_enrollment_year: {
        schoolUnitId: unitSD.id,
        enrollmentYear: 2024,
      },
    },
    update: { amount: 150000 },
    create: {
      schoolUnitId: unitSD.id,
      enrollmentYear: 2024,
      amount: 150000,
    },
  });

  // SD Angkatan 2025: Rp 175.000 / bulan
  await prisma.sppTariff.upsert({
    where: {
      uq_school_unit_enrollment_year: {
        schoolUnitId: unitSD.id,
        enrollmentYear: 2025,
      },
    },
    update: { amount: 175000 },
    create: {
      schoolUnitId: unitSD.id,
      enrollmentYear: 2025,
      amount: 175000,
    },
  });

  // RA Angkatan 2025: Rp 120.000 / bulan
  await prisma.sppTariff.upsert({
    where: {
      uq_school_unit_enrollment_year: {
        schoolUnitId: unitRA.id,
        enrollmentYear: 2025,
      },
    },
    update: { amount: 120000 },
    create: {
      schoolUnitId: unitRA.id,
      enrollmentYear: 2025,
      amount: 120000,
    },
  });

  // KB Angkatan 2025: Rp 100.000 / bulan
  await prisma.sppTariff.upsert({
    where: {
      uq_school_unit_enrollment_year: {
        schoolUnitId: unitKB.id,
        enrollmentYear: 2025,
      },
    },
    update: { amount: 100000 },
    create: {
      schoolUnitId: unitKB.id,
      enrollmentYear: 2025,
      amount: 100000,
    },
  });
  console.log('Tarif dasar SPP berhasil disiapkan.');

  // 6. Seed Data Master: Siswa (Student)
  console.log('Seeding data siswa pengujian...');
  
  await prisma.student.upsert({
    where: { studentNumber: 'SD-2024-001' },
    update: {
      name: 'Budi Santoso',
      className: '6A',
      schoolUnitId: unitSD.id,
      parentId: parent.id,
      enrollmentYear: 2024,
      discountPercentage: 10,
      birthDate: '10-05-2015',
    },
    create: {
      studentNumber: 'SD-2024-001',
      name: 'Budi Santoso',
      className: '6A',
      schoolUnitId: unitSD.id,
      parentId: parent.id,
      enrollmentYear: 2024,
      discountPercentage: 10,
      birthDate: '10-05-2015',
    },
  });

  await prisma.student.upsert({
    where: { studentNumber: 'RA-2025-001' },
    update: {
      name: 'Siti Aminah',
      className: 'RA-A',
      schoolUnitId: unitRA.id,
      parentId: parent.id,
      enrollmentYear: 2025,
      discountPercentage: 0,
      birthDate: '21-08-2020',
    },
    create: {
      studentNumber: 'RA-2025-001',
      name: 'Siti Aminah',
      className: 'RA-A',
      schoolUnitId: unitRA.id,
      parentId: parent.id,
      enrollmentYear: 2025,
      discountPercentage: 0,
      birthDate: '21-08-2020',
    },
  });

  await prisma.student.upsert({
    where: { studentNumber: 'SD-2024-002' },
    update: {
      name: 'Rian Hidayat',
      className: '6B',
      schoolUnitId: unitSD.id,
      parentId: parentRudi.id,
      enrollmentYear: 2024,
      discountPercentage: 0,
      birthDate: '15-11-2014',
    },
    create: {
      studentNumber: 'SD-2024-002',
      name: 'Rian Hidayat',
      className: '6B',
      schoolUnitId: unitSD.id,
      parentId: parentRudi.id,
      enrollmentYear: 2024,
      discountPercentage: 0,
      birthDate: '15-11-2014',
    },
  });

  await prisma.student.upsert({
    where: { studentNumber: 'SD-2025-001' },
    update: {
      name: 'Dewi Lestari',
      className: '5A',
      schoolUnitId: unitSD.id,
      parentId: parentSinta.id,
      enrollmentYear: 2025,
      discountPercentage: 20,
      birthDate: '03-02-2016',
    },
    create: {
      studentNumber: 'SD-2025-001',
      name: 'Dewi Lestari',
      className: '5A',
      schoolUnitId: unitSD.id,
      parentId: parentSinta.id,
      enrollmentYear: 2025,
      discountPercentage: 20,
      birthDate: '03-02-2016',
    },
  });

  console.log('Data siswa pengujian berhasil disiapkan.');

  // 7. Seed Invoices & Transactions (Data Transaksional Kas)
  console.log('Seeding data tagihan dan transaksi kas masuk/keluar...');
  
  const studentBudi = await prisma.student.findUnique({ where: { studentNumber: 'SD-2024-001' } });
  
  if (studentBudi) {
    // Generate invoice & transaksi SPP Januari - Juni 2026 untuk Budi
    for (let m = 1; m <= 6; m++) {
      const baseAmount = 150000;
      const discountApplied = 15000; // 10%
      const amount = baseAmount - discountApplied;
      const status = m <= 3 ? 'PAID' : 'PENDING';
      
      const invoice = await prisma.invoice.upsert({
        where: {
          uq_student_billing_period: {
            studentId: studentBudi.id,
            month: m,
            year: 2026,
            invoiceType: 'SPP',
          },
        },
        update: {
          status,
        },
        create: {
          studentId: studentBudi.id,
          invoiceType: 'SPP',
          month: m,
          year: 2026,
          baseAmount,
          discountApplied,
          amount,
          status,
          midtransOrderId: status === 'PAID' ? `MOCK-SNAP-BUDI-${m}` : null,
        },
      });
      
      if (status === 'PAID') {
        // Buat transaksi SPP masuk di kasir
        await prisma.transaction.create({
          data: {
            date: new Date(2026, m - 1, 10, 10, 0, 0),
            type: 'INCOME',
            categoryId: 1, // SPP
            invoiceId: invoice.id,
            paymentMethod: 'TRANSFER',
            amount,
            description: `Pembayaran SPP Budi Santoso Bulan ${m} 2026`,
            schoolUnitId: studentBudi.schoolUnitId,
            recordedById: adminSD.id,
          },
        });
      }
    }

    // Seed UANG_PENGEMBANGAN invoice for Budi Santoso (Cicilan / Partial Payment)
    const baseDevAmount = 2000000; // Rp 2.000.000
    const devInvoice = await prisma.invoice.upsert({
      where: {
        uq_student_billing_period: {
          studentId: studentBudi.id,
          month: 7, // arbitrary month representing initialization
          year: 2025,
          invoiceType: 'UANG_PENGEMBANGAN',
        },
      },
      update: {
        status: 'PARTIALLY_PAID',
      },
      create: {
        studentId: studentBudi.id,
        invoiceType: 'UANG_PENGEMBANGAN',
        month: 7,
        year: 2025,
        baseAmount: baseDevAmount,
        discountApplied: 0,
        amount: baseDevAmount,
        status: 'PARTIALLY_PAID',
      },
    });

    // Create a transaction of Rp 500.000 linked to this invoice
    await prisma.transaction.create({
      data: {
        date: new Date(2025, 6, 15, 10, 0, 0),
        type: 'INCOME',
        categoryId: 7, // Uang Pengembangan
        invoiceId: devInvoice.id,
        paymentMethod: 'CASH',
        amount: 500000,
        description: 'Cicilan Ke-1 Uang Pengembangan Budi Santoso',
        schoolUnitId: studentBudi.schoolUnitId,
        recordedById: adminSD.id,
      },
    });
  }

  // Tambahkan transaksi Pengeluaran Kas agar grafik dashboard seimbang
  await prisma.transaction.create({
    data: {
      date: new Date(2026, 0, 15, 14, 0, 0),
      type: 'EXPENSE',
      categoryId: 6, // Operasional
      paymentMethod: 'CASH',
      amount: 50000,
      description: 'Pembelian ATK Kantor Sekolah',
      schoolUnitId: unitSD.id,
      recordedById: adminSD.id,
    },
  });

  await prisma.transaction.create({
    data: {
      date: new Date(2026, 1, 28, 16, 30, 0),
      type: 'EXPENSE',
      categoryId: 5, // Gaji Guru
      paymentMethod: 'TRANSFER',
      amount: 200000,
      description: 'Pembayaran Gaji Guru Honor SD',
      schoolUnitId: unitSD.id,
      recordedById: adminSD.id,
    },
  });

  console.log('🔄 Menyinkronkan database sequence auto-increment...');

  // Daftar tabel yang menggunakan ID auto-increment statis di seeder
  const tables = ['school_units', 'categories'];

  const isPostgres = process.env.DATABASE_URL?.startsWith('postgres') || process.env.DATABASE_URL?.startsWith('postgresql');
  if (isPostgres) {
    for (const tableName of tables) {
      await prisma.$executeRawUnsafe(`
        SELECT setval(
          pg_get_serial_sequence('"${tableName}"', 'id'),
          coalesce(max(id), 0) + 1,
          false
        ) FROM "${tableName}";
      `);
    }
    console.log('✅ Semua database sequence berhasil disinkronkan!');
  } else {
    console.log('ℹ️ Mengabaikan sinkronisasi sequence auto-increment untuk SQLite.');
  }

  console.log('\n=== Proses Seeding Selesai dengan Sukses! ===');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Terjadi error saat proses seeding:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
