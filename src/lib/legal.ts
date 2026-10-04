export const POLICY_VERSION = "2026-10-03";

export const legal = {
  entity: process.env.LEGAL_ENTITY_NAME || "Contractor Marketplace (operator details pending)",
  address: process.env.LEGAL_ADDRESS || "Business address available upon request",
  email: process.env.SUPPORT_EMAIL || "support@example.com",
  state: process.env.GOVERNING_STATE || "the operator's state",
  minimumAge: Number(process.env.MINIMUM_AGE || 18),
  effectiveDate: POLICY_VERSION,
};

export function validateProductionLegalConfig() {
  if (process.env.VERCEL_ENV !== "production" && process.env.ENFORCE_LEGAL_CONFIG !== "true") return;
  const required = ["LEGAL_ENTITY_NAME", "LEGAL_ADDRESS", "SUPPORT_EMAIL", "GOVERNING_STATE"] as const;
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing required production legal configuration: ${missing.join(", ")}`);
}
