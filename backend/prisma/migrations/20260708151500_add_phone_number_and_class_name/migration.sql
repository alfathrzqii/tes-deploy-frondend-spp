-- AlterTable
ALTER TABLE "users" ADD COLUMN "phone_number" VARCHAR(20);

-- AlterTable
ALTER TABLE "students" ADD COLUMN "class_name" VARCHAR(50) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");
