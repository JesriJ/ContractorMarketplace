-- CreateEnum
CREATE TYPE "HireRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Job" ALTER COLUMN "budget" DROP NOT NULL;

-- CreateTable
CREATE TABLE "HireRequest" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "HireRequestStatus" NOT NULL DEFAULT 'PENDING',
    "jobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HireRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HireRequest_jobId_key" ON "HireRequest"("jobId");

-- CreateIndex
CREATE INDEX "HireRequest_customerId_idx" ON "HireRequest"("customerId");

-- CreateIndex
CREATE INDEX "HireRequest_contractorId_idx" ON "HireRequest"("contractorId");

-- CreateIndex
CREATE INDEX "HireRequest_status_idx" ON "HireRequest"("status");

-- AddForeignKey
ALTER TABLE "HireRequest" ADD CONSTRAINT "HireRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HireRequest" ADD CONSTRAINT "HireRequest_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HireRequest" ADD CONSTRAINT "HireRequest_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
