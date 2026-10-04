import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageThread } from "@/components/MessageThread";
import { getConversation } from "@/lib/messages";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Conversation | Contractor Marketplace",
  robots: { index: false, follow: false },
};

type ConversationPageProps = {
  params: Promise<{ conversationId: string }>;
};

export default async function ConversationPage({ params }: ConversationPageProps) {
  await requireSession();
  const { conversationId } = await params;
  const result = await getConversation(conversationId);
  if (!result.ok) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm text-slate-500">
        <Link href="/messages" className="hover:text-slate-800">
          Messages
        </Link>
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{result.data.otherParty}</h1>
      <p className="mt-1 text-sm text-slate-600">
        Job:{" "}
        <Link href={`/jobs/${result.data.jobId}`} className="font-medium text-blue-700 hover:text-blue-800">
          {result.data.jobTitle}
        </Link>
      </p>
      <div className="mt-6">
        <MessageThread initial={result.data} />
      </div>
    </section>
  );
}
