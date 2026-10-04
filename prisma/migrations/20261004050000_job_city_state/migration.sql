-- AlterTable
ALTER TABLE "Job"
  ADD COLUMN IF NOT EXISTS "city" TEXT,
  ADD COLUMN IF NOT EXISTS "state" TEXT;

CREATE INDEX IF NOT EXISTS "Job_state_idx" ON "Job"("state");
CREATE INDEX IF NOT EXISTS "Job_city_idx" ON "Job"("city");
