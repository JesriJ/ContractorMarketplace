import { JobStatus, Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { messageSchema, messageValidationError } from "@/lib/validations/message";

const messageableStatuses: JobStatus[] = [
  JobStatus.ASSIGNED,
  JobStatus.IN_PROGRESS,
  JobStatus.PENDING_CONFIRMATION,
  JobStatus.COMPLETED,
];

class MessageError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type MessageResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

export type ConversationSummary = {
  id: string;
  jobId: string;
  jobTitle: string;
  otherParty: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

export type ConversationMessage = {
  id: string;
  content: string;
  createdAt: string;
  mine: boolean;
};

export type ConversationDetail = {
  id: string;
  jobId: string;
  jobTitle: string;
  otherParty: string;
  messages: ConversationMessage[];
};

type Viewer = {
  id: string;
  role: UserRole;
  profileId: string | null;
};

const conversationAccessSelect = {
  id: true,
  customerId: true,
  contractorId: true,
  jobId: true,
  customerLastReadAt: true,
  contractorLastReadAt: true,
  job: { select: { id: true, title: true, status: true, customerId: true, contractorId: true } },
  customer: { select: { id: true, email: true } },
  contractor: { select: { id: true, userId: true, companyName: true } },
} satisfies Prisma.ConversationSelect;

type ConversationAccess = Prisma.ConversationGetPayload<{ select: typeof conversationAccessSelect }>;

export async function createJobConversation(
  tx: Prisma.TransactionClient,
  input: { jobId: string; customerId: string; contractorId: string },
) {
  const now = new Date();
  await tx.conversation.create({
    data: {
      jobId: input.jobId,
      customerId: input.customerId,
      contractorId: input.contractorId,
      customerLastReadAt: now,
      contractorLastReadAt: now,
    },
  });
}

function fromError(error: unknown): MessageResult<never> {
  if (error instanceof MessageError) {
    return { ok: false, status: error.status, error: error.message };
  }
  return { ok: false, status: 500, error: "Unable to load messages." };
}

async function viewer(): Promise<Viewer> {
  const session = await getSession();
  if (!session?.user) {
    throw new MessageError(401, "Not authenticated.");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, contractorProfile: { select: { id: true } } },
  });
  if (!user) {
    throw new MessageError(401, "Not authenticated.");
  }

  return { id: user.id, role: user.role, profileId: user.contractorProfile?.id ?? null };
}

function isParticipant(conversation: { customerId: string; contractorId: string }, user: Viewer) {
  return conversation.customerId === user.id || conversation.contractorId === user.profileId;
}

function otherPartyName(conversation: ConversationAccess, user: Viewer) {
  if (conversation.customerId === user.id) {
    return conversation.contractor.companyName;
  }
  return conversation.customer.email;
}

async function unreadCount(conversation: ConversationAccess, user: Viewer) {
  const lastRead =
    conversation.customerId === user.id
      ? conversation.customerLastReadAt
      : conversation.contractorLastReadAt;

  return prisma.message.count({
    where: {
      conversationId: conversation.id,
      senderId: { not: user.id },
      ...(lastRead ? { createdAt: { gt: lastRead } } : {}),
    },
  });
}

async function requireConversation(id: string, user: Viewer) {
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    select: conversationAccessSelect,
  });
  if (!conversation) {
    throw new MessageError(404, "Conversation not found.");
  }
  if (!isParticipant(conversation, user)) {
    throw new MessageError(403, "Unauthorized.");
  }
  return conversation;
}

async function markRead(conversation: ConversationAccess, user: Viewer) {
  const now = new Date();
  await prisma.conversation.update({
    where: { id: conversation.id },
    data:
      conversation.customerId === user.id
        ? { customerLastReadAt: now }
        : { contractorLastReadAt: now },
  });
}

const CONVERSATION_PAGE_SIZE = 20;

export type ConversationList = {
  conversations: ConversationSummary[];
  page: number;
  pageCount: number;
  total: number;
};

export async function listConversations(requestedPage = 1): Promise<MessageResult<ConversationList>> {
  try {
    const user = await viewer();
    const where = {
      OR: [{ customerId: user.id }, { contractor: { userId: user.id } }],
    };
    const total = await prisma.conversation.count({ where });
    const pageCount = Math.max(1, Math.ceil(total / CONVERSATION_PAGE_SIZE));
    const page = Math.min(requestedPage > 0 ? requestedPage : 1, pageCount);
    const conversations = await prisma.conversation.findMany({
      where,
      select: {
        ...conversationAccessSelect,
        messages: {
          orderBy: { createdAt: "desc" as const },
          take: 1,
          select: { content: true, createdAt: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * CONVERSATION_PAGE_SIZE,
      take: CONVERSATION_PAGE_SIZE,
    });

    const summaries = await Promise.all(
      conversations.map(async (conversation) => ({
        id: conversation.id,
        jobId: conversation.jobId,
        jobTitle: conversation.job.title,
        otherParty: otherPartyName(conversation, user),
        lastMessage: conversation.messages[0]?.content ?? null,
        lastMessageAt: conversation.messages[0]?.createdAt.toISOString() ?? null,
        unreadCount: await unreadCount(conversation, user),
      })),
    );

    return { ok: true, data: { conversations: summaries, page, pageCount, total } };
  } catch (error) {
    return fromError(error);
  }
}

export async function getConversation(id: string): Promise<MessageResult<ConversationDetail>> {
  try {
    const user = await viewer();
    const conversation = await requireConversation(id, user);
    const messages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, content: true, createdAt: true, senderId: true },
    });
    await markRead(conversation, user);

    return {
      ok: true,
      data: {
        id: conversation.id,
        jobId: conversation.jobId,
        jobTitle: conversation.job.title,
        otherParty: otherPartyName(conversation, user),
        messages: messages.map((message) => ({
          id: message.id,
          content: message.content,
          createdAt: message.createdAt.toISOString(),
          mine: message.senderId === user.id,
        })),
      },
    };
  } catch (error) {
    return fromError(error);
  }
}

export async function sendMessage(conversationId: string, input: unknown): Promise<MessageResult<ConversationMessage>> {
  try {
    const user = await viewer();
    const parsed = messageSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, status: 400, error: messageValidationError(parsed.error) };
    }

    const conversation = await requireConversation(conversationId, user);
    const now = new Date();
    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId: conversation.id,
          senderId: user.id,
          content: parsed.data.content,
        },
        select: { id: true, content: true, createdAt: true },
      });

      await tx.conversation.update({
        where: { id: conversation.id },
        data:
          conversation.customerId === user.id
            ? { customerLastReadAt: now }
            : { contractorLastReadAt: now },
      });

      return created;
    });

    return {
      ok: true,
      data: {
        id: message.id,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
        mine: true,
      },
    };
  } catch (error) {
    return fromError(error);
  }
}

export async function openConversationForJob(jobId: string): Promise<MessageResult<{ id: string }>> {
  try {
    const user = await viewer();
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, customerId: true, contractorId: true, status: true },
    });
    if (!job || !job.contractorId) {
      return { ok: false, status: 404, error: "Job not found." };
    }

    const allowed = job.customerId === user.id || job.contractorId === user.profileId;
    if (!allowed) {
      return { ok: false, status: 403, error: "Unauthorized." };
    }
    if (!messageableStatuses.includes(job.status)) {
      return { ok: false, status: 400, error: "Messaging is available after a contractor is assigned." };
    }

    const existing = await prisma.conversation.findUnique({
      where: { jobId: job.id },
      select: { id: true },
    });
    if (existing) {
      return { ok: true, data: existing };
    }

    try {
      const created = await prisma.conversation.create({
        data: {
          jobId: job.id,
          customerId: job.customerId,
          contractorId: job.contractorId,
        },
        select: { id: true },
      });
      return { ok: true, data: created };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const conversation = await prisma.conversation.findUnique({
          where: { jobId: job.id },
          select: { id: true },
        });
        if (conversation) {
          return { ok: true, data: conversation };
        }
      }
      throw error;
    }
  } catch (error) {
    return fromError(error);
  }
}
