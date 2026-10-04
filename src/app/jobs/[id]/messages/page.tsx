import { redirect } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { openConversationForJob } from "@/lib/messages";
import { requireSession } from "@/lib/session";

type JobMessagesPageProps = {
  params: Promise<{ id: string }>;
};

export default async function JobMessagesPage({ params }: JobMessagesPageProps) {
  await requireSession();
  const { id } = await params;
  const result = await openConversationForJob(id);
  if (!result.ok) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12">
        <EmptyState title="Unable to open messages" description={result.error} />
      </section>
    );
  }

  redirect(`/messages/${result.data.id}`);
}
