-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'OPERATOR');
CREATE TYPE "EquipmentCategory" AS ENUM ('AUDIO', 'CABLES', 'CAMERAS', 'COMPUTING', 'DISPLAYS', 'LIGHTING', 'OTHERS');
CREATE TYPE "EquipmentStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'FAULTY', 'RENTED_OUT');
CREATE TYPE "RentalType" AS ENUM ('IN', 'OUT');
CREATE TYPE "RentalStatus" AS ENUM ('ACTIVE', 'RETURNED', 'CANCELLED');
CREATE TYPE "FaultStatus" AS ENUM ('OPEN', 'IN_REPAIR', 'RESOLVED');
CREATE TYPE "ActivityAction" AS ENUM (
  'REGISTER',
  'LOGIN',
  'ADMIN_UNLOCK',
  'EQUIPMENT_CREATED',
  'EQUIPMENT_UPDATED',
  'SIGN_OUT',
  'RETURN',
  'FAULT_REPORTED',
  'FAULT_UPDATED',
  'RENTAL_CREATED',
  'RENTAL_RETURNED',
  'SAMPLE_SEEDED'
);

CREATE TABLE "Organization" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'OWNER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Equipment" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "serialNumber" TEXT NOT NULL,
  "brand" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "category" "EquipmentCategory" NOT NULL,
  "purchaseDate" TIMESTAMP(3),
  "warrantyDate" TIMESTAMP(3),
  "conditionNotes" TEXT NOT NULL DEFAULT '',
  "status" "EquipmentStatus" NOT NULL DEFAULT 'AVAILABLE',
  "currentOperator" TEXT,
  "useCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Rental" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "equipmentId" TEXT,
  "type" "RentalType" NOT NULL,
  "counterparty" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "status" "RentalStatus" NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Rental_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Fault" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "equipmentId" TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" "FaultStatus" NOT NULL DEFAULT 'OPEN',
  "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Fault_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Activity" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "userId" TEXT,
  "equipmentId" TEXT,
  "action" "ActivityAction" NOT NULL,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX "User_orgId_email_key" ON "User"("orgId", "email");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE UNIQUE INDEX "Equipment_orgId_serialNumber_key" ON "Equipment"("orgId", "serialNumber");
CREATE INDEX "Activity_orgId_createdAt_idx" ON "Activity"("orgId", "createdAt");

ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Rental" ADD CONSTRAINT "Rental_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Rental" ADD CONSTRAINT "Rental_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Fault" ADD CONSTRAINT "Fault_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Fault" ADD CONSTRAINT "Fault_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Fault" ADD CONSTRAINT "Fault_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
