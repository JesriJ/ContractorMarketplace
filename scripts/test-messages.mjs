import { PrismaClient } from "@prisma/client";

const base = process.env.APP_URL ?? "http://localhost:3000";
const prisma = new PrismaClient();
const stamp = Date.now();
const password = "password123";
const emails = {
  customer: `phase5-customer-${stamp}@example.com`,
  other: `phase5-other-${stamp}@example.com`,
  contractorA: `phase5-a-${stamp}@example.com`,
  contractorB: `phase5-b-${stamp}@example.com`,
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function rememberCookies(response, jar) {
  for (const cookie of response.headers.getSetCookie()) {
    const [pair] = cookie.split(";");
    const index = pair.indexOf("=");
    if (index > 0) jar.set(pair.slice(0, index), pair.slice(index + 1));
  }
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
}

async function request(path, { method = "GET", body, jar } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    redirect: "manual",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(jar ? { cookie: cookieHeader(jar) } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: response.status, json, text, location: response.headers.get("location") };
}

async function register(email, role) {
  const result = await request("/api/register", {
    method: "POST",
    body: { email, password, confirmPassword: password, role },
  });
  assert(result.status === 201, `register failed ${result.status} ${result.text}`);
  return result.json.user;
}

async function login(email) {
  const jar = new Map();
  const csrfResponse = await fetch(`${base}/api/auth/csrf`);
  rememberCookies(csrfResponse, jar);
  const { csrfToken } = await csrfResponse.json();
  const loginResponse = await fetch(`${base}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      cookie: cookieHeader(jar),
    },
    body: new URLSearchParams({ csrfToken, email, password, callbackUrl: `${base}/dashboard`, json: "true" }),
  });
  rememberCookies(loginResponse, jar);
  const session = await request("/api/auth/session", { jar });
  assert(session.json?.user?.email === email, `login failed for ${email}`);
  return jar;
}

async function createProfile(jar, companyName) {
  const result = await request("/api/contractors", {
    method: "POST",
    jar,
    body: {
      companyName,
      trade: "Plumbing",
      bio: "Residential plumbing repairs.",
      city: "College Park",
      state: "MD",
      yearsExperience: 5,
      hourlyRate: "70",
    },
  });
  assert(result.status === 201, `profile failed ${result.status} ${result.text}`);
  return result.json.profile;
}

async function main() {
  const customer = await register(emails.customer, "CUSTOMER");
  const other = await register(emails.other, "CUSTOMER");
  await register(emails.contractorA, "CONTRACTOR");
  await register(emails.contractorB, "CONTRACTOR");
  const customerJar = await login(emails.customer);
  const otherJar = await login(emails.other);
  const contractorA = await login(emails.contractorA);
  const contractorB = await login(emails.contractorB);
  const profileA = await createProfile(contractorA, "Message Plumbing");
  await createProfile(contractorB, "Message Electric");

  const job = await request("/api/jobs", {
    method: "POST",
    jar: customerJar,
    body: {
      title: "Fix leaking kitchen sink",
      description: "The pipe under the sink is leaking.",
      budget: "250",
      location: "College Park, MD",
    },
  });
  assert(job.status === 201, `job failed ${job.text}`);
  const bid = await request(`/api/jobs/${job.json.job.id}/bids`, {
    method: "POST",
    jar: contractorA,
    body: { amount: "200", message: "I can repair this Saturday.", estimatedDuration: "2 hours" },
  });
  assert(bid.status === 201, `bid failed ${bid.text}`);
  const accepted = await request(`/api/jobs/${job.json.job.id}/bids/${bid.json.bid.id}/accept`, {
    method: "POST",
    jar: customerJar,
    body: {},
  });
  assert(accepted.status === 200, `accept failed ${accepted.text}`);

  const conversation = await prisma.conversation.findUnique({ where: { jobId: job.json.job.id } });
  assert(conversation, "accepting a bid did not create a conversation");
  assert(conversation.customerId === customer.id, "conversation customer mismatch");
  assert(conversation.contractorId === profileA.id, "conversation contractor mismatch");

  const anonymous = await request(`/api/conversations/${conversation.id}`);
  assert(anonymous.status === 401, `anonymous read expected 401, got ${anonymous.status}`);

  const outsiderRead = await request(`/api/conversations/${conversation.id}`, { jar: otherJar });
  assert(outsiderRead.status === 403, `other customer read expected 403, got ${outsiderRead.status} ${outsiderRead.text}`);

  const outsiderSend = await request(`/api/conversations/${conversation.id}`, {
    method: "POST",
    jar: contractorB,
    body: { content: "I should not be here." },
  });
  assert(outsiderSend.status === 403, `other contractor send expected 403, got ${outsiderSend.status}`);

  const missing = await request("/api/conversations/does-not-exist", { jar: customerJar });
  assert(missing.status === 404, `missing conversation expected 404, got ${missing.status}`);

  const empty = await request(`/api/conversations/${conversation.id}`, {
    method: "POST",
    jar: customerJar,
    body: { content: "   ", senderId: other.id },
  });
  assert(empty.status === 400, `empty message expected 400, got ${empty.status}`);

  const sent = await request(`/api/conversations/${conversation.id}`, {
    method: "POST",
    jar: customerJar,
    body: { content: "Can you come Saturday morning?", senderId: other.id },
  });
  assert(sent.status === 201, `send failed ${sent.status} ${sent.text}`);
  const stored = await prisma.message.findUnique({ where: { id: sent.json.message.id } });
  assert(stored.senderId === customer.id, "sender id was taken from the client");
  assert(stored.createdAt instanceof Date, "message has no timestamp");

  const contractorList = await request("/api/conversations", { jar: contractorA });
  assert(contractorList.status === 200, "contractor list failed");
  const listed = contractorList.json.conversations.find((item) => item.id === conversation.id);
  assert(listed, "contractor cannot see the conversation");
  assert(listed.unreadCount === 1, `expected 1 unread, got ${listed.unreadCount}`);
  assert(listed.lastMessage === "Can you come Saturday morning?", "last message mismatch");

  const hiddenList = await request("/api/conversations", { jar: contractorB });
  assert(!hiddenList.json.conversations.some((item) => item.id === conversation.id), "unrelated contractor sees the conversation");

  const thread = await request(`/api/conversations/${conversation.id}`, { jar: contractorA });
  assert(thread.status === 200, `thread failed ${thread.status}`);
  assert(thread.json.messages.length === 1, "message missing from thread");
  assert(thread.json.messages[0].mine === false, "contractor message was marked as theirs");
  assert(thread.json.messages[0].createdAt, "thread message has no timestamp");

  const afterRead = await request("/api/conversations", { jar: contractorA });
  const readItem = afterRead.json.conversations.find((item) => item.id === conversation.id);
  assert(readItem.unreadCount === 0, `opening the thread should clear unread, got ${readItem.unreadCount}`);

  const reply = await request(`/api/conversations/${conversation.id}`, {
    method: "POST",
    jar: contractorA,
    body: { content: "Saturday morning works." },
  });
  assert(reply.status === 201, `reply failed ${reply.text}`);

  const customerThread = await request(`/api/conversations/${conversation.id}`, { jar: customerJar });
  assert(customerThread.json.messages.length === 2, "reply missing");
  assert(customerThread.json.messages[0].mine === true, "customer message ownership mismatch");
  assert(customerThread.json.messages[1].mine === false, "contractor reply was marked as the customer's");

  const page = await request(`/messages/${conversation.id}`, { jar: otherJar });
  assert(page.status === 404, `outsider page expected 404, got ${page.status}`);

  const hire = await request(`/api/contractors/${profileA.id}/hire-requests`, {
    method: "POST",
    jar: customerJar,
    body: { message: "Please replace a hallway light." },
  });
  assert(hire.status === 201, `hire request failed ${hire.text}`);
  const hireAccepted = await request(`/api/hire-requests/${hire.json.request.id}/accept`, {
    method: "POST",
    jar: contractorA,
    body: {},
  });
  assert(hireAccepted.status === 200, `hire accept failed ${hireAccepted.text}`);
  const hireConversation = await prisma.conversation.findUnique({
    where: { jobId: hireAccepted.json.request.jobId },
  });
  assert(hireConversation, "accepting a service request did not create a conversation");

  console.log("phase 5 messaging checks passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.user.deleteMany({ where: { email: { in: Object.values(emails) } } });
    await prisma.$disconnect();
  });
