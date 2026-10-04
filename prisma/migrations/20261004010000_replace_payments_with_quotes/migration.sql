-- Archive legacy payment rows before this migration if production data must be retained.
DROP TABLE IF EXISTS "StripeWebhookEvent";
DROP TABLE IF EXISTS "Payment";

CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED');

ALTER TABLE "User" ADD COLUMN "deactivatedAt" TIMESTAMP(3);
ALTER TABLE "ContractorProfile"
  ADD COLUMN "identityAttestedAt" TIMESTAMP(3),
  ADD COLUMN "licenseAttestedAt" TIMESTAMP(3),
  ADD COLUMN "insuranceAttestedAt" TIMESTAMP(3);

CREATE TABLE "Quote" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "contractorId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "acceptedById" TEXT,
  "version" INTEGER NOT NULL,
  "status" "QuoteStatus" NOT NULL DEFAULT 'SENT',
  "scope" TEXT NOT NULL,
  "laborAmount" DECIMAL(10,2) NOT NULL,
  "materialsAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(10,2) NOT NULL,
  "depositTerms" TEXT,
  "milestoneTerms" TEXT,
  "schedule" TEXT NOT NULL,
  "cancellationTerms" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "declinedAt" TIMESTAMP(3),
  "paidOutsideAt" TIMESTAMP(3),
  "paidOutsideById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegalConsent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "termsVersion" TEXT NOT NULL,
  "privacyVersion" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LegalConsent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Quote_jobId_version_key" ON "Quote"("jobId", "version");
CREATE INDEX "Quote_jobId_status_idx" ON "Quote"("jobId", "status");
CREATE INDEX "LegalConsent_userId_acceptedAt_idx" ON "LegalConsent"("userId", "acceptedAt");
CREATE INDEX "AuditEvent_userId_createdAt_idx" ON "AuditEvent"("userId", "createdAt");
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

ALTER TABLE "Quote" ADD CONSTRAINT "Quote_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LegalConsent" ADD CONSTRAINT "LegalConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
