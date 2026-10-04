import { PrismaClient } from "@prisma/client";

const base = process.env.APP_URL ?? "http://localhost:3000";
const prisma = new PrismaClient();
const stamp = Date.now();
const password = "password123";

const emails = {
  customer: `phase3-customer-${stamp}@example.com`,
  other: `phase3-other-${stamp}@example.com`,
  contractorA: `phase3-a-${stamp}@example.com`,
  contractorB: `phase3-b-${stamp}@example.com`,
  contractorC: `phase3-c-${stamp}@example.com`,
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function rememberCookies(response, jar) {
  for (const cookie of response.headers.getSetCookie()) {
    const [pair] = cookie.split(";");
    const index = pair.indexOf("=");
    if (index > 0) {
      jar.set(pair.slice(0, index), pair.slice(index + 1));
    }
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
  assert(result.status === 201, `register ${email} failed: ${result.status} ${result.text}`);
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
    body: new URLSearchParams({
      csrfToken,
      email,
      password,
      callbackUrl: `${base}/dashboard`,
      json: "true",
    }),
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
      yearsExperience: 4,
      hourlyRate: "80",
      verified: true,
    },
  });
  assert(result.status === 201, `profile ${companyName} failed: ${result.status} ${result.text}`);
  assert(result.json.profile.verified === false, "profile verified flag was client-controlled");
  return result.json.profile;
}

const jobInput = {
  title: "Fix leaking kitchen sink",
  description: "The kitchen sink has been leaking from the pipe underneath.",
  budget: "300",
  location: "College Park, MD",
  customerId: "ignore-me",
  status: "ASSIGNED",
};

const bidInput = (amount, message) => ({
  amount,
  message,
  estimatedDuration: "2 hours",
  contractorId: "ignore-me",
});

async function main() {
  const customer = await register(emails.customer, "CUSTOMER");
  const other = await register(emails.other, "CUSTOMER");
  const contractorAUser = await register(emails.contractorA, "CONTRACTOR");
  await register(emails.contractorB, "CONTRACTOR");
  await register(emails.contractorC, "CONTRACTOR");

  const customerJar = await login(emails.customer);
  const otherJar = await login(emails.other);
  const contractorA = await login(emails.contractorA);
  const contractorB = await login(emails.contractorB);
  const contractorC = await login(emails.contractorC);

  const profileA = await createProfile(contractorA, "Phase Three Plumbing");
  await createProfile(contractorB, "Phase Three Electrical");
  await createProfile(contractorC, "Phase Three Paint");

  const anonymousJob = await request("/api/jobs", { method: "POST", body: jobInput });
  assert(anonymousJob.status === 401, `anonymous job expected 401, got ${anonymousJob.status}`);

  const contractorJob = await request("/api/jobs", { method: "POST", jar: contractorA, body: jobInput });
  assert(contractorJob.status === 403, `contractor job expected 403, got ${contractorJob.status}`);

  const invalidJob = await request("/api/jobs", {
    method: "POST",
    jar: customerJar,
    body: { ...jobInput, budget: "0", title: "" },
  });
  assert(invalidJob.status === 400, `invalid job expected 400, got ${invalidJob.status} ${invalidJob.text}`);

  const created = await request("/api/jobs", { method: "POST", jar: customerJar, body: jobInput });
  assert(created.status === 201, `create job failed: ${created.status} ${created.text}`);
  assert(created.json.job.status === "OPEN", "new job should be open");
  const jobId = created.json.job.id;

  const storedJob = await prisma.job.findUnique({ where: { id: jobId } });
  assert(storedJob.customerId === customer.id, "job was assigned to the client-supplied customer");
  assert(storedJob.status === "OPEN", "client status was stored");

  const ownJob = await prisma.job.create({
    data: {
      title: "Owned by contractor",
      description: "Should not accept a bid from this contractor.",
      budget: "100",
      location: "College Park, MD",
      customerId: contractorAUser.id,
    },
  });
  const ownBid = await request(`/api/jobs/${ownJob.id}/bids`, {
    method: "POST",
    jar: contractorA,
    body: bidInput("90", "I should not be able to bid."),
  });
  assert(ownBid.status === 403, `own-job bid expected 403, got ${ownBid.status} ${ownBid.text}`);

  const customerBid = await request(`/api/jobs/${jobId}/bids`, {
    method: "POST",
    jar: customerJar,
    body: bidInput("250", "A customer cannot bid."),
  });
  assert(customerBid.status === 403, `customer bid expected 403, got ${customerBid.status}`);

  const invalidBid = await request(`/api/jobs/${jobId}/bids`, {
    method: "POST",
    jar: contractorA,
    body: { amount: "0", message: "", estimatedDuration: "" },
  });
  assert(invalidBid.status === 400, `invalid bid expected 400, got ${invalidBid.status} ${invalidBid.text}`);

  const bidA = await request(`/api/jobs/${jobId}/bids`, {
    method: "POST",
    jar: contractorA,
    body: bidInput("250", "I can repair the leak this weekend."),
  });
  assert(bidA.status === 201, `bid A failed: ${bidA.status} ${bidA.text}`);

  const duplicate = await request(`/api/jobs/${jobId}/bids`, {
    method: "POST",
    jar: contractorA,
    body: bidInput("240", "Second bid."),
  });
  assert(duplicate.status === 409, `duplicate bid expected 409, got ${duplicate.status} ${duplicate.text}`);

  const bidB = await request(`/api/jobs/${jobId}/bids`, {
    method: "POST",
    jar: contractorB,
    body: bidInput("280", "Available on Thursday."),
  });
  assert(bidB.status === 201, `bid B failed: ${bidB.status} ${bidB.text}`);

  const biddingJob = await prisma.job.findUnique({ where: { id: jobId } });
  assert(biddingJob.status === "BIDDING", "job should be bidding after the first bid");

  const edited = await request(`/api/jobs/${jobId}`, {
    method: "PUT",
    jar: customerJar,
    body: { ...jobInput, title: "Repair kitchen sink leak", status: "COMPLETED", customerId: other.id },
  });
  assert(edited.status === 200, `owner edit failed: ${edited.status} ${edited.text}`);
  assert(edited.json.job.status === "BIDDING", "edit changed the job status");
  assert(edited.json.job.title === "Repair kitchen sink leak", "title was not updated");

  const editedRow = await prisma.job.findUnique({ where: { id: jobId } });
  assert(editedRow.customerId === customer.id, "edit moved job ownership");

  const otherEdit = await request(`/api/jobs/${jobId}`, {
    method: "PUT",
    jar: otherJar,
    body: { ...jobInput, title: "Hijacked" },
  });
  assert(otherEdit.status === 403, `other customer edit expected 403, got ${otherEdit.status}`);

  const otherAccept = await request(`/api/jobs/${jobId}/bids/${bidA.json.bid.id}/accept`, {
    method: "POST",
    jar: otherJar,
    body: {},
  });
  assert(otherAccept.status === 403, `other customer accept expected 403, got ${otherAccept.status}`);

  const contractorAccept = await request(`/api/jobs/${jobId}/bids/${bidA.json.bid.id}/accept`, {
    method: "POST",
    jar: contractorA,
    body: {},
  });
  assert(contractorAccept.status === 403, `contractor accept expected 403, got ${contractorAccept.status}`);

  const hiddenFromB = await request(`/api/jobs/${jobId}`, { jar: contractorB });
  assert(hiddenFromB.status === 200, "contractor should be able to view the job");
  assert(hiddenFromB.json.bids.length === 0, "contractor can see another contractor's bids");
  assert(hiddenFromB.json.myBid.amount === "280" || Number(hiddenFromB.json.myBid.amount) === 280, "own bid missing");
  assert(!hiddenFromB.text.includes("this weekend"), "other bid message leaked");

  const ownerView = await request(`/api/jobs/${jobId}`, { jar: customerJar });
  assert(ownerView.json.bids.length === 2, "owner should see both bids");

  const accepted = await request(`/api/jobs/${jobId}/bids/${bidA.json.bid.id}/accept`, {
    method: "POST",
    jar: customerJar,
    body: {},
  });
  assert(accepted.status === 200, `accept failed: ${accepted.status} ${accepted.text}`);
  assert(accepted.json.job.status === "ASSIGNED", "accepted job should be assigned");
  assert(accepted.json.job.contractor.id === profileA.id, "accepted bid did not assign that contractor");

  const secondAccept = await request(`/api/jobs/${jobId}/bids/${bidB.json.bid.id}/accept`, {
    method: "POST",
    jar: customerJar,
    body: {},
  });
  assert(secondAccept.status === 400, `second accept expected 400, got ${secondAccept.status} ${secondAccept.text}`);

  const acceptedBid = await prisma.bid.findUnique({ where: { id: bidA.json.bid.id } });
  const rejectedBid = await prisma.bid.findUnique({ where: { id: bidB.json.bid.id } });
  const assignedJob = await prisma.job.findUnique({ where: { id: jobId } });
  assert(acceptedBid.status === "ACCEPTED", "winning bid was not accepted");
  assert(rejectedBid.status === "REJECTED", "losing bid was not rejected");
  assert(assignedJob.contractorId === profileA.id, "job contractor id mismatch");
  assert(assignedJob.status === "ASSIGNED", "job status mismatch");

  const lateBid = await request(`/api/jobs/${jobId}/bids`, {
    method: "POST",
    jar: contractorC,
    body: bidInput("200", "Too late."),
  });
  assert(lateBid.status === 400, `bid after assignment expected 400, got ${lateBid.status} ${lateBid.text}`);

  const lockedEdit = await request(`/api/jobs/${jobId}`, {
    method: "PUT",
    jar: customerJar,
    body: { ...jobInput, title: "Should stay assigned" },
  });
  assert(lockedEdit.status === 400, `edit after assignment expected 400, got ${lockedEdit.status}`);

  const search = await request("/api/jobs?keyword=sink&location=College%20Park");
  assert(search.status === 200, "search failed");
  assert(!search.json.jobs.some((job) => job.id === jobId), "assigned job remained in the open list");

  const publicPage = await request(`/jobs/${jobId}`);
  assert(publicPage.status === 200 && publicPage.text.includes("Repair kitchen sink leak"), "public job page missing title");
  assert(publicPage.text.includes("Phase Three Plumbing"), "assigned contractor missing from the job page");

  const second = await request("/api/jobs", {
    method: "POST",
    jar: customerJar,
    body: {
      title: "Paint the living room",
      description: "Two walls need a fresh coat of paint.",
      budget: "500",
      location: "Greenbelt, MD",
    },
  });
  assert(second.status === 201, `second job failed: ${second.status} ${second.text}`);
  const secondBid = await request(`/api/jobs/${second.json.job.id}/bids`, {
    method: "POST",
    jar: contractorB,
    body: bidInput("450", "I can paint this week."),
  });
  assert(secondBid.status === 201, `bid on second job failed: ${secondBid.status} ${secondBid.text}`);

  const rejected = await request(`/api/jobs/${second.json.job.id}/bids/${secondBid.json.bid.id}/reject`, {
    method: "POST",
    jar: otherJar,
    body: {},
  });
  assert(rejected.status === 403, `other customer reject expected 403, got ${rejected.status}`);

  const cancelled = await request(`/api/jobs/${second.json.job.id}`, {
    method: "POST",
    jar: customerJar,
    body: { action: "cancel" },
  });
  assert(cancelled.status === 200, `cancel failed: ${cancelled.status} ${cancelled.text}`);
  assert(cancelled.json.job.status === "CANCELLED", "cancelled job status mismatch");

  const cancelledBid = await prisma.bid.findUnique({ where: { id: secondBid.json.bid.id } });
  assert(cancelledBid.status === "REJECTED", "cancelling a job left the bid pending");

  const openSearch = await request("/api/jobs?keyword=paint");
  assert(!openSearch.json.jobs.some((job) => job.id === second.json.job.id), "cancelled job stayed in search");

  console.log("phase 3 job and bid checks passed");
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
