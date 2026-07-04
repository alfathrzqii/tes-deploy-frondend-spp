-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'UNIT_ADMIN', 'PARENT');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('SPP', 'EKSTRAKURIKULER', 'KEGIATAN', 'LAINNYA');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'MIDTRANS', 'TRANSFER');

-- CreateTable
CREATE TABLE "school_units" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "school_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL,
    "school_unit_id" INTEGER,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spp_tariffs" (
    "id" SERIAL NOT NULL,
    "school_unit_id" INTEGER NOT NULL,
    "enrollment_year" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "spp_tariffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" SERIAL NOT NULL,
    "student_number" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "school_unit_id" INTEGER NOT NULL,
    "parent_id" INTEGER NOT NULL,
    "enrollment_year" INTEGER NOT NULL,
    "discount_percentage" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" "CategoryType" NOT NULL,
    "school_unit_id" INTEGER,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "invoice_type" "InvoiceType" NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "base_amount" INTEGER NOT NULL,
    "discount_applied" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "midtrans_order_id" VARCHAR(255),

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "CategoryType" NOT NULL,
    "category_id" INTEGER NOT NULL,
    "invoice_id" INTEGER,
    "payment_method" "PaymentMethod" NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT,
    "school_unit_id" INTEGER NOT NULL,
    "recorded_by_id" INTEGER,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "spp_tariffs_school_unit_id_enrollment_year_key" ON "spp_tariffs"("school_unit_id", "enrollment_year");

-- CreateIndex
CREATE UNIQUE INDEX "students_student_number_key" ON "students"("student_number");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_midtrans_order_id_key" ON "invoices"("midtrans_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_student_id_month_year_invoice_type_key" ON "invoices"("student_id", "month", "year", "invoice_type");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_school_unit_id_fkey" FOREIGN KEY ("school_unit_id") REFERENCES "school_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spp_tariffs" ADD CONSTRAINT "spp_tariffs_school_unit_id_fkey" FOREIGN KEY ("school_unit_id") REFERENCES "school_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_school_unit_id_fkey" FOREIGN KEY ("school_unit_id") REFERENCES "school_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_school_unit_id_fkey" FOREIGN KEY ("school_unit_id") REFERENCES "school_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_school_unit_id_fkey" FOREIGN KEY ("school_unit_id") REFERENCES "school_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
