import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { getContractorProfileForUser } from "@/lib/contractor-profiles";
import { requireRole } from "@/lib/session";

export default async function ContractorProfileIndexPage() {
  const session = await requireRole(UserRole.CONTRACTOR);
  const profile = await getContractorProfileForUser(session.user.id);

  if (!profile) {
    redirect("/contractor-profile/create");
  }

  redirect("/contractor-profile/edit");
}
