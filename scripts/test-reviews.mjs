import { PrismaClient } from "@prisma/client";

const base = process.env.APP_URL ?? "http://localhost:3000";
const prisma = new PrismaClient();
const stamp = Date.now();
const password = "password123";
const emails = {
  customer: `phase6-customer-${stamp}@example.com`,
  other: `phase6-other-${stamp}@example.com`,
  contractorA: `phase6-a-${stamp}@example.com`,
  contractorB: `phase6-b-${stamp}@example.com`,
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
  return { status: response.status, json, text };
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
      yearsExperience: 8,
      hourlyRate: "85",
    },
  });
  assert(result.status === 201, `profile failed ${result.text}`);
  return result.json.profile;
}

async function main() {
  await register(emails.customer, "CUSTOMER");
  await register(emails.other, "CUSTOMER");
  await register(emails.contractorA, "CONTRACTOR");
  await register(emails.contractorB, "CONTRACTOR");
  const customerJar = await login(emails.customer);
  const otherJar = await login(emails.other);
  const contractorA = await login(emails.contractorA);
  const contractorB = await login(emails.contractorB);
  const profileA = await createProfile(contractorA, "Review Plumbing");
  await createProfile(contractorB, "Review Electric");

  const job = await request("/api/jobs", {
    method: "POST",
    jar: customerJar,
    body: {
      title: "Replace bathroom faucet",
      description: "The bathroom faucet needs to be replaced.",
      budget: "180",
      location: "College Park, MD",
    },
  });
  const bid = await request(`/api/jobs/${job.json.job.id}/bids`, {
    method: "POST",
    jar: contractorA,
    body: { amount: "150", message: "I can replace it tomorrow.", estimatedDuration: "1 hour" },
  });
  const accepted = await request(`/api/jobs/${job.json.job.id}/bids/${bid.json.bid.id}/accept`, {
    method: "POST",
    jar: customerJar,
    body: {},
  });
  assert(accepted.status === 200, `accept failed ${accepted.text}`);
  const jobId = job.json.job.id;

  const customerStart = await request(`/api/jobs/${jobId}/start`, { method: "POST", jar: customerJar, body: {} });
  assert(customerStart.status === 403, `customer start expected 403, got ${customerStart.status}`);

  const otherStart = await request(`/api/jobs/${jobId}/start`, { method: "POST", jar: contractorB, body: {} });
  assert(otherStart.status === 403, `other contractor start expected 403, got ${otherStart.status}`);

  const earlyComplete = await request(`/api/jobs/${jobId}/complete`, { method: "POST", jar: contractorA, body: {} });
  assert(earlyComplete.status === 400, `complete before start expected 400, got ${earlyComplete.status}`);

  const earlyConfirm = await request(`/api/jobs/${jobId}/confirm`, { method: "POST", jar: customerJar, body: {} });
  assert(earlyConfirm.status === 400, `confirm before completion request expected 400, got ${earlyConfirm.status}`);

  const earlyReview = await request(`/api/jobs/${jobId}/reviews`, {
    method: "POST",
    jar: customerJar,
    body: { rating: 5, comment: "Too early." },
  });
  assert(earlyReview.status === 400, `review before completion expected 400, got ${earlyReview.status}`);

  const started = await request(`/api/jobs/${jobId}/start`, { method: "POST", jar: contractorA, body: {} });
  assert(started.status === 200 && started.json.job.status === "IN_PROGRESS", `start failed ${started.text}`);

  const startAgain = await request(`/api/jobs/${jobId}/start`, { method: "POST", jar: contractorA, body: {} });
  assert(startAgain.status === 400, `second start expected 400, got ${startAgain.status}`);

  const marked = await request(`/api/jobs/${jobId}/complete`, { method: "POST", jar: contractorA, body: {} });
  assert(marked.status === 200 && marked.json.job.status === "PENDING_CONFIRMATION", `mark complete failed ${marked.text}`);

  const contractorConfirm = await request(`/api/jobs/${jobId}/confirm`, { method: "POST", jar: contractorA, body: {} });
  assert(contractorConfirm.status === 403, `contractor confirm expected 403, got ${contractorConfirm.status}`);

  const otherConfirm = await request(`/api/jobs/${jobId}/confirm`, { method: "POST", jar: otherJar, body: {} });
  assert(otherConfirm.status === 403, `other customer confirm expected 403, got ${otherConfirm.status}`);

  const confirmed = await request(`/api/jobs/${jobId}/confirm`, { method: "POST", jar: customerJar, body: {} });
  assert(confirmed.status === 200 && confirmed.json.job.status === "COMPLETED", `confirm failed ${confirmed.text}`);

  const confirmAgain = await request(`/api/jobs/${jobId}/confirm`, { method: "POST", jar: customerJar, body: {} });
  assert(confirmAgain.status === 400, `second confirm expected 400, got ${confirmAgain.status}`);

  const badRating = await request(`/api/jobs/${jobId}/reviews`, {
    method: "POST",
    jar: customerJar,
    body: { rating: 6, comment: "Too high." },
  });
  assert(badRating.status === 400, `invalid rating expected 400, got ${badRating.status}`);

  const otherReview = await request(`/api/jobs/${jobId}/reviews`, {
    method: "POST",
    jar: otherJar,
    body: { rating: 5, comment: "Not my job." },
  });
  assert(otherReview.status === 403, `other customer review expected 403, got ${otherReview.status}`);

  const review = await request(`/api/jobs/${jobId}/reviews`, {
    method: "POST",
    jar: customerJar,
    body: { rating: 4, comment: "Showed up on time and fixed the faucet.", contractorId: "ignore-me" },
  });
  assert(review.status === 201, `review failed ${review.status} ${review.text}`);

  const duplicate = await request(`/api/jobs/${jobId}/reviews`, {
    method: "POST",
    jar: customerJar,
    body: { rating: 1, comment: "Second review." },
  });
  assert(duplicate.status === 409, `duplicate review expected 409, got ${duplicate.status}`);

  const stored = await prisma.review.findMany({ where: { jobId } });
  assert(stored.length === 1 && stored[0].rating === 4, "review was not stored once");
  assert(stored[0].contractorId === profileA.id, "review contractor was taken from the client");

  const profile = await request(`/api/contractors/${profileA.id}`);
  assert(profile.status === 200, `profile failed ${profile.status}`);
  assert(profile.json.reviewCount === 1, "review count mismatch");
  assert(profile.json.ratingAverage === 4, `average mismatch ${profile.json.ratingAverage}`);
  assert(profile.json.reviews[0].comment.includes("faucet"), "profile missing review text");
  assert(profile.json.pastWork.some((item) => item.title === "Replace bathroom faucet"), "completed work missing");

  console.log("phase 6 completion and review checks passed");
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
