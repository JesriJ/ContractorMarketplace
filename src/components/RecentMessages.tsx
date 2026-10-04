import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { listConversations } from "@/lib/messages";

export async function RecentMessages() {
  const result = await listConversations();

  if (!result.ok) {
    return <EmptyState title="Unable to load messages" description={result.error} />;
  }

  if (result.data.conversations.length === 0) {
    return (
      <EmptyState
        title="No conversations yet."
        description="A conversation opens after a bid or service request is accepted."
      />
    );
  }

  return (
    <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
      {result.data.conversations.slice(0, 5).map((conversation) => (
        <li key={conversation.id}>
          <Link href={`/messages/${conversation.id}`} className="block px-4 py-3 text-sm hover:bg-slate-50">
            <span className="flex items-center justify-between gap-3">
              <span className="font-medium text-slate-900">{conversation.otherParty}</span>
              {conversation.unreadCount > 0 ? (
                <span className="text-xs font-medium text-blue-800">{conversation.unreadCount} unread</span>
              ) : null}
            </span>
            <span className="mt-1 block text-slate-600">{conversation.lastMessage ?? conversation.jobTitle}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
