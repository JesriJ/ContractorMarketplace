import { PrismaClient } from "@prisma/client";

const base = process.env.APP_URL ?? "http://localhost:3000";
const prisma = new PrismaClient();
const stamp = Date.now();
const contractorEmail = `phase2-contractor-${stamp}@example.com`;
const customerEmail = `phase2-customer-${stamp}@example.com`;
const password = "password123";
const createdEmails = [contractorEmail, customerEmail];

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
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(jar ? { cookie: cookieHeader(jar) } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
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
  assert(result.status === 201, `register ${role} failed: ${result.status} ${result.text}`);
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
  assert(session.json?.user?.email === email, `login failed for ${email}: ${session.text}`);
  return jar;
}

const validProfile = {
  companyName: "Phase Two Plumbing",
  trade: "Plumbing",
  bio: "Residential leak repairs and fixture replacement.",
  city: "College Park",
  state: "md",
  yearsExperience: 5,
  hourlyRate: "75.50",
};

async function main() {
  const contractor = await register(contractorEmail, "CONTRACTOR");
  const customer = await register(customerEmail, "CUSTOMER");
  const contractorJar = await login(contractorEmail);
  const customerJar = await login(customerEmail);

  const dashboardBeforeProfile = await request("/dashboard", { jar: contractorJar });
  assert(
    dashboardBeforeProfile.status === 307 &&
      dashboardBeforeProfile.location?.includes("/contractor-profile/create"),
    `contractor without a profile should be sent to create, got ${dashboardBeforeProfile.status} ${dashboardBeforeProfile.location}`,
  );

  const anonymousCreate = await request("/api/contractors", {
    method: "POST",
    body: validProfile,
  });
  assert(anonymousCreate.status === 401, `anonymous create expected 401, got ${anonymousCreate.status}`);

  const customerCreate = await request("/api/contractors", {
    method: "POST",
    jar: customerJar,
    body: validProfile,
  });
  assert(customerCreate.status === 403, `customer create expected 403, got ${customerCreate.status}`);

  const invalidCreate = await request("/api/contractors", {
    method: "POST",
    jar: contractorJar,
    body: { ...validProfile, hourlyRate: "0", state: "ZZ", verified: true },
  });
  assert(invalidCreate.status === 400, `invalid profile expected 400, got ${invalidCreate.status} ${invalidCreate.text}`);

  const created = await request("/api/contractors", {
    method: "POST",
    jar: contractorJar,
    body: { ...validProfile, verified: true, userId: customer.id },
  });
  assert(created.status === 201, `create profile failed: ${created.status} ${created.text}`);
  assert(created.json.profile.verified === false, "verified must stay false");
  assert(created.json.profile.state === "MD", "state should be normalized");
  assert(created.json.profile.companyName === "Phase Two Plumbing", "company name mismatch");

  const stored = await prisma.contractorProfile.findUnique({ where: { userId: contractor.id } });
  assert(stored, "profile row missing");
  assert(stored.userId === contractor.id, "profile was assigned to the wrong user");
  assert(stored.verified === false, "database verified flag was set by the client");
  assert(Number(stored.hourlyRate) === 75.5, `hourly rate stored as ${stored.hourlyRate.toString()}`);

  const duplicate = await request("/api/contractors", {
    method: "POST",
    jar: contractorJar,
    body: validProfile,
  });
  assert(duplicate.status === 409, `duplicate create expected 409, got ${duplicate.status}`);

  const found = await request("/api/contractors?trade=plumb&city=college%20park");
  assert(found.status === 200, `search failed: ${found.status}`);
  assert(
    found.json.contractors.some((contractorResult) => contractorResult.id === created.json.profile.id),
    "search did not return the new profile",
  );

  const missed = await request("/api/contractors?trade=roofing&city=college%20park");
  assert(
    !missed.json.contractors.some((contractorResult) => contractorResult.id === created.json.profile.id),
    "unrelated trade search returned the profile",
  );

  const stateSearch = await request("/api/contractors?state=MD&trade=plumbing");
  assert(
    stateSearch.json.contractors.some((contractorResult) => contractorResult.id === created.json.profile.id),
    "state search missed the profile",
  );

  const updated = await request("/api/contractors/me", {
    method: "PUT",
    jar: contractorJar,
    body: {
      ...validProfile,
      companyName: "Phase Two Plumbing Co",
      hourlyRate: "80",
      verified: true,
      userId: customer.id,
    },
  });
  assert(updated.status === 200, `update failed: ${updated.status} ${updated.text}`);
  assert(updated.json.profile.companyName === "Phase Two Plumbing Co", "company name was not updated");
  assert(updated.json.profile.verified === false, "update allowed verified to change");
  assert(updated.json.profile.hourlyRate === "80" || updated.json.profile.hourlyRate === "80.00", "hourly rate was not updated");

  const storedAfterUpdate = await prisma.contractorProfile.findUnique({ where: { userId: contractor.id } });
  assert(storedAfterUpdate.userId === contractor.id, "update moved the profile to another user");
  assert(storedAfterUpdate.verified === false, "update stored verified=true");

  const customerUpdate = await request("/api/contractors/me", {
    method: "PUT",
    jar: customerJar,
    body: { ...validProfile, companyName: "Hijacked" },
  });
  assert(customerUpdate.status === 403, `customer update expected 403, got ${customerUpdate.status}`);

  const publicPage = await request(`/contractors/${created.json.profile.id}`);
  assert(publicPage.status === 200, `public profile expected 200, got ${publicPage.status}`);
  assert(publicPage.text.includes("Phase Two Plumbing Co"), "public profile missing company name");
  assert(publicPage.text.includes("Not verified"), "public profile should say not verified");
  assert(!publicPage.text.includes("Verified by the platform"), "public profile showed a verified badge");

  const directory = await request("/contractors?trade=plumbing&city=College+Park");
  assert(directory.status === 200 && directory.text.includes("Phase Two Plumbing Co"), "directory search page missed the profile");

  const customerProfilePage = await request("/contractor-profile/create", { jar: customerJar });
  assert(
    customerProfilePage.status === 307 && customerProfilePage.location?.includes("contractor-only"),
    `customer profile page expected redirect, got ${customerProfilePage.status} ${customerProfilePage.location}`,
  );

  const signedOutCreate = await request("/contractor-profile/create");
  assert(
    signedOutCreate.status === 307 && signedOutCreate.location?.includes("/login"),
    `signed-out create page expected login redirect, got ${signedOutCreate.status} ${signedOutCreate.location}`,
  );

  console.log("phase 2 profile checks passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
    await prisma.$disconnect();
  });
