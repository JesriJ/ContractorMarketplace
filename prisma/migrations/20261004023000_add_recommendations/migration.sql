-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "ContractorProfile"
  ADD COLUMN "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "serviceCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "serviceRadiusMiles" INTEGER NOT NULL DEFAULT 25,
  ADD COLUMN "availabilityNotes" TEXT,
  ADD COLUMN "preferredRateMax" DECIMAL(8,2),
  ADD COLUMN "embedding" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[];

-- CreateTable
CREATE TABLE "JobRequirements" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "requiredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "preferredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "projectType" TEXT,
  "experienceLevel" TEXT,
  "budgetMin" DECIMAL(10,2),
  "budgetMax" DECIMAL(10,2),
  "locationText" TEXT,
  "requiredByDate" TIMESTAMP(3),
  "availabilityHint" TEXT,
  "rawExtraction" JSONB,
  "embedding" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
  "extractedAt" TIMESTAMP(3),
  "extractionStatus" "ExtractionStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JobRequirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRecommendation" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "contractorId" TEXT NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "breakdown" JSONB NOT NULL,
  "reasons" JSONB NOT NULL,
  "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JobRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "jobId" TEXT,
  "contractorId" TEXT,
  "eventType" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecommendationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobRequirements_jobId_key" ON "JobRequirements"("jobId");
CREATE UNIQUE INDEX "JobRecommendation_jobId_contractorId_key" ON "JobRecommendation"("jobId", "contractorId");
CREATE INDEX "JobRecommendation_contractorId_score_idx" ON "JobRecommendation"("contractorId", "score");
CREATE INDEX "JobRecommendation_jobId_score_idx" ON "JobRecommendation"("jobId", "score");
CREATE INDEX "RecommendationEvent_eventType_createdAt_idx" ON "RecommendationEvent"("eventType", "createdAt");
CREATE INDEX "RecommendationEvent_userId_createdAt_idx" ON "RecommendationEvent"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "JobRequirements" ADD CONSTRAINT "JobRequirements_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobRecommendation" ADD CONSTRAINT "JobRecommendation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobRecommendation" ADD CONSTRAINT "JobRecommendation_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
