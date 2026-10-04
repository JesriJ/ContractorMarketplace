import { PrismaClient } from "@prisma/client";

const base = process.env.APP_URL ?? "http://localhost:3000";
const prisma = new PrismaClient();
const stamp = Date.now();
const password = "password123";
const emails = {
  customer: `phase4-customer-${stamp}@example.com`,
  other: `phase4-other-${stamp}@example.com`,
  contractorA: `phase4-a-${stamp}@example.com`,
  contractorB: `phase4-b-${stamp}@example.com`,
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
  return { status: response.status, location: response.headers.get("location"), json, text };
}

async function register(email, role) {
  const result = await request("/api/register", {
    method: "POST",
    body: { email, password, confirmPassword: password, role },
  });
  assert(result.status === 201, `register failed: ${result.status} ${result.text}`);
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

async function createProfile(jar, companyName, city) {
  const result = await request("/api/contractors", {
    method: "POST",
    jar,
    body: {
      companyName,
      trade: "Plumbing",
      bio: "Residential plumbing repairs.",
      city,
      state: "MD",
      yearsExperience: 6,
      hourlyRate: "90",
    },
  });
  assert(result.status === 201, `profile failed: ${result.status} ${result.text}`);
  return result.json.profile;
}

async function main() {
  const customer = await register(emails.customer, "CUSTOMER");
  await register(emails.other, "CUSTOMER");
  const contractorUser = await register(emails.contractorA, "CONTRACTOR");
  await register(emails.contractorB, "CONTRACTOR");

  const customerJar = await login(emails.customer);
  const otherJar = await login(emails.other);
  const contractorA = await login(emails.contractorA);
  const contractorB = await login(emails.contractorB);

  const profileA = await createProfile(contractorA, "Direct Hire Plumbing", "College Park");
  const profileB = await createProfile(contractorB, "Direct Hire Electric", "Greenbelt");

  const signedOut = await request("/hire-requests");
  assert(signedOut.status === 307 && signedOut.location?.includes("/login"), "requests page should require login");

  const emptyMessage = await request(`/api/contractors/${profileA.id}/hire-requests`, {
    method: "POST",
    jar: customerJar,
    body: { message: "   " },
  });
  assert(emptyMessage.status === 400, `empty request expected 400, got ${emptyMessage.status}`);

  const contractorCreate = await request(`/api/contractors/${profileB.id}/hire-requests`, {
    method: "POST",
    jar: contractorA,
    body: { message: "Contractors should not request service this way." },
  });
  assert(contractorCreate.status === 403, `contractor request expected 403, got ${contractorCreate.status}`);

  const created = await request(`/api/contractors/${profileA.id}/hire-requests`, {
    method: "POST",
    jar: customerJar,
    body: {
      message: "I need help replacing two bathroom faucets sometime this week.",
      contractorId: profileB.id,
      customerId: contractorUser.id,
    },
  });
  assert(created.status === 201, `create request failed: ${created.status} ${created.text}`);
  assert(created.json.request.status === "PENDING", "new request should be pending");
  assert(created.json.request.contractor.id === profileA.id, "request went to the wrong contractor");
  const requestId = created.json.request.id;

  const stored = await prisma.hireRequest.findUnique({ where: { id: requestId } });
  assert(stored.customerId === customer.id, "request customer came from the client");

  const otherView = await request(`/api/hire-requests/${requestId}`, { jar: otherJar });
  assert(otherView.status === 403, `other customer view expected 403, got ${otherView.status}`);

  const otherList = await request("/api/hire-requests", { jar: otherJar });
  assert(otherList.json.requests.length === 0, "other customer can see the request");

  const wrongAccept = await request(`/api/hire-requests/${requestId}/accept`, {
    method: "POST",
    jar: contractorB,
    body: {},
  });
  assert(wrongAccept.status === 403, `wrong contractor accept expected 403, got ${wrongAccept.status}`);

  const customerAccept = await request(`/api/hire-requests/${requestId}/accept`, {
    method: "POST",
    jar: customerJar,
    body: {},
  });
  assert(customerAccept.status === 403, `customer accept expected 403, got ${customerAccept.status}`);

  const accepted = await request(`/api/hire-requests/${requestId}/accept`, {
    method: "POST",
    jar: contractorA,
    body: {},
  });
  assert(accepted.status === 200, `accept failed: ${accepted.status} ${accepted.text}`);
  assert(accepted.json.request.status === "ACCEPTED", "request was not accepted");
  assert(accepted.json.request.jobId, "acceptance did not create a job");

  const again = await request(`/api/hire-requests/${requestId}/accept`, {
    method: "POST",
    jar: contractorA,
    body: {},
  });
  assert(again.status === 400, `second accept expected 400, got ${again.status} ${again.text}`);

  const jobs = await prisma.job.findMany({ where: { customerId: customer.id } });
  assert(jobs.length === 1, `acceptance created ${jobs.length} jobs`);
  assert(jobs[0].id === accepted.json.request.jobId, "request points at a different job");
  assert(jobs[0].status === "ASSIGNED", "direct-hire job should be assigned");
  assert(jobs[0].contractorId === profileA.id, "job was assigned to the wrong contractor");
  assert(jobs[0].budget === null, "direct-hire job invented a budget");
  assert(jobs[0].location === "College Park, MD", "job location mismatch");

  const openSearch = await request("/api/jobs?keyword=faucets");
  assert(!openSearch.json.jobs.some((job) => job.id === jobs[0].id), "assigned direct-hire job is publicly open");

  const cancelAccepted = await request(`/api/hire-requests/${requestId}`, {
    method: "POST",
    jar: customerJar,
    body: { action: "cancel" },
  });
  assert(cancelAccepted.status === 400, `cancel after accept expected 400, got ${cancelAccepted.status}`);

  const contractorList = await request("/api/hire-requests", { jar: contractorA });
  assert(contractorList.json.requests.some((item) => item.id === requestId), "contractor cannot see the incoming request");
  const hiddenList = await request("/api/hire-requests", { jar: contractorB });
  assert(!hiddenList.json.requests.some((item) => item.id === requestId), "another contractor can see the request");

  const rejectedRequest = await request(`/api/contractors/${profileA.id}/hire-requests`, {
    method: "POST",
    jar: customerJar,
    body: { message: "Please look at a dripping shower." },
  });
  assert(rejectedRequest.status === 201, `second request failed: ${rejectedRequest.status}`);
  const rejected = await request(`/api/hire-requests/${rejectedRequest.json.request.id}/reject`, {
    method: "POST",
    jar: contractorA,
    body: {},
  });
  assert(rejected.status === 200 && rejected.json.request.status === "REJECTED", "reject failed");
  const jobsAfterReject = await prisma.job.count({ where: { customerId: customer.id } });
  assert(jobsAfterReject === 1, "reject created a job");

  const toCancel = await request(`/api/contractors/${profileB.id}/hire-requests`, {
    method: "POST",
    jar: customerJar,
    body: { message: "Need an outlet replaced." },
  });
  assert(toCancel.status === 201, `cancel candidate failed: ${toCancel.status}`);
  const otherCancel = await request(`/api/hire-requests/${toCancel.json.request.id}`, {
    method: "POST",
    jar: otherJar,
    body: { action: "cancel" },
  });
  assert(otherCancel.status === 403, `other customer cancel expected 403, got ${otherCancel.status}`);
  const cancelled = await request(`/api/hire-requests/${toCancel.json.request.id}`, {
    method: "POST",
    jar: customerJar,
    body: { action: "cancel" },
  });
  assert(cancelled.status === 200 && cancelled.json.request.status === "CANCELLED", "cancel failed");
  const acceptCancelled = await request(`/api/hire-requests/${toCancel.json.request.id}/accept`, {
    method: "POST",
    jar: contractorB,
    body: {},
  });
  assert(acceptCancelled.status === 400, `accept after cancel expected 400, got ${acceptCancelled.status}`);

  const page = await request(`/hire-requests/${requestId}`, { jar: customerJar });
  assert(page.status === 200 && page.text.includes("Accepted"), "customer request page missing status");

  console.log("phase 4 direct-hire checks passed");
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
