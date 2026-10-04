-- AlterTable
ALTER TABLE "ContractorProfile"
  ADD COLUMN IF NOT EXISTS "availability" TEXT,
  ADD COLUMN IF NOT EXISTS "portfolioImages" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Job"
  ADD COLUMN IF NOT EXISTS "requiredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "projectType" TEXT,
  ADD COLUMN IF NOT EXISTS "experienceLevel" TEXT,
  ADD COLUMN IF NOT EXISTS "availabilityNeeded" TEXT,
  ADD COLUMN IF NOT EXISTS "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
