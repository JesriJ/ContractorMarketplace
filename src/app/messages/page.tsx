import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { formatPostedDate } from "@/lib/format";
import { listConversations } from "@/lib/messages";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Messages | Contractor Marketplace",
  robots: { index: false, follow: false },
};

type MessagesPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  await requireSession();
  const { page } = await searchParams;
  const parsedPage = Number(page ?? "1");
  const result = await listConversations(Number.isFinite(parsedPage) ? parsedPage : 1);
  const conversations = result.ok ? result.data.conversations : [];

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Messages</h1>
      <p className="mt-2 text-sm text-slate-600">Conversations for jobs you are part of.</p>

      {!result.ok ? (
        <div className="mt-6">
          <EmptyState title="Unable to load messages" description={result.error} />
        </div>
      ) : null}

      {result.ok && conversations.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No conversations yet."
            description="A conversation opens after a bid or service request is accepted."
          />
        </div>
      ) : null}

      {result.ok && conversations.length > 0 ? (
        <ul className="mt-6 divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <Link href={`/messages/${conversation.id}`} className="block px-4 py-3 hover:bg-slate-50">
                <span className="flex items-start justify-between gap-3">
                  <span className="text-sm font-medium text-slate-900">{conversation.otherParty}</span>
                  {conversation.unreadCount > 0 ? (
                    <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800">
                      {conversation.unreadCount} unread
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 block text-sm text-slate-600">{conversation.jobTitle}</span>
                <span className="mt-1 block text-sm text-slate-700">
                  {conversation.lastMessage ?? "No messages yet."}
                </span>
                {conversation.lastMessageAt ? (
                  <span className="mt-1 block text-xs text-slate-500">
                    {formatPostedDate(conversation.lastMessageAt)}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {result.ok && result.data.pageCount > 1 ? (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Conversation pages">
          {result.data.page > 1 ? (
            <Link href={`/messages?page=${result.data.page - 1}`} className="font-medium text-blue-700 hover:text-blue-800">
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-slate-600">
            Page {result.data.page} of {result.data.pageCount}
          </span>
          {result.data.page < result.data.pageCount ? (
            <Link href={`/messages?page=${result.data.page + 1}`} className="font-medium text-blue-700 hover:text-blue-800">
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </section>
  );
}
