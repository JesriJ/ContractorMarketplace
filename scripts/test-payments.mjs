import { PrismaClient } from "@prisma/client";
import fs from "fs";
import Stripe from "stripe";

const base = process.env.APP_URL ?? "http://localhost:3000";
const prisma = new PrismaClient();
const stripe = new Stripe("sk_test_webhook_verification");
const stamp = Date.now();
const password = "password123";
const emails = {
  customer: `phase7-customer-${stamp}@example.com`,
  other: `phase7-other-${stamp}@example.com`,
  contractor: `phase7-contractor-${stamp}@example.com`,
};

function webhookSecret() {
  const text = fs.readFileSync(".env", "utf8");
  const match = text.match(/^STRIPE_WEBHOOK_SECRET="?([^"\r\n]+)"?/m);
  return match?.[1]?.trim() ?? "";
}

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

async function request(path, { method = "GET", body, jar, raw, signature } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    redirect: "manual",
    headers: {
      ...(raw ? { "Content-Type": "application/json" } : body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(jar ? { cookie: cookieHeader(jar) } : {}),
      ...(signature ? { "stripe-signature": signature } : {}),
    },
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
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

function sign(payload, secret) {
  return stripe.webhooks.generateTestHeaderString({ payload, secret });
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

async function postEvent(secret, event) {
  const payload = JSON.stringify(event);
  return request("/api/stripe/webhook", {
    method: "POST",
    raw: payload,
    signature: sign(payload, secret),
  });
}

async function main() {
  const secret = webhookSecret();
  assert(secret, "STRIPE_WEBHOOK_SECRET is missing");

  const customer = await register(emails.customer, "CUSTOMER");
  await register(emails.other, "CUSTOMER");
  await register(emails.contractor, "CONTRACTOR");
  const customerJar = await login(emails.customer);
  const otherJar = await login(emails.other);
  const contractorJar = await login(emails.contractor);

  const profile = await request("/api/contractors", {
    method: "POST",
    jar: contractorJar,
    body: {
      companyName: "Payment Plumbing",
      trade: "Plumbing",
      bio: "Residential plumbing repairs.",
      city: "College Park",
      state: "MD",
      yearsExperience: 5,
      hourlyRate: "70",
    },
  });
  assert(profile.status === 201, `profile failed ${profile.text}`);

  const job = await request("/api/jobs", {
    method: "POST",
    jar: customerJar,
    body: {
      title: "Fix leaking kitchen sink",
      description: "The pipe under the sink is leaking.",
      budget: "300",
      location: "College Park, MD",
    },
  });
  const bid = await request(`/api/jobs/${job.json.job.id}/bids`, {
    method: "POST",
    jar: contractorJar,
    body: { amount: "250.50", message: "I can fix this.", estimatedDuration: "2 hours" },
  });
  const accepted = await request(`/api/jobs/${job.json.job.id}/bids/${bid.json.bid.id}/accept`, {
    method: "POST",
    jar: customerJar,
    body: {},
  });
  assert(accepted.status === 200, `accept failed ${accepted.text}`);
  const jobId = job.json.job.id;

  const outsider = await request(`/api/jobs/${jobId}/checkout`, {
    method: "POST",
    jar: otherJar,
    body: { amount: 1, status: "SUCCEEDED" },
  });
  assert(outsider.status === 403, `outsider checkout expected 403, got ${outsider.status}`);

  const checkout = await request(`/api/jobs/${jobId}/checkout`, {
    method: "POST",
    jar: customerJar,
    body: { amount: 1, status: "SUCCEEDED" },
  });
  let payment;
  if (checkout.status === 503) {
    const createdPayments = await prisma.payment.count({ where: { jobId } });
    assert(createdPayments === 0, "checkout created a payment before Stripe was configured");
    payment = await prisma.payment.create({
      data: {
        jobId,
        customerId: customer.id,
        contractorId: profile.json.profile.id,
        amount: "250.50",
        currency: "usd",
        stripeCheckoutSessionId: `cs_test_${stamp}`,
      },
    });
  } else {
    assert(checkout.status === 200 && checkout.json.url.includes("checkout.stripe.com"), `checkout failed ${checkout.status} ${checkout.text}`);
    payment = await prisma.payment.findUnique({ where: { jobId } });
    assert(payment, "checkout did not store a payment");
    assert(Number(payment.amount) === 250.5, "checkout used the client amount");
    assert(payment.status === "PENDING", "checkout trusted a client payment status");
  }

  const missingSignature = await request("/api/stripe/webhook", {
    method: "POST",
    raw: "{}",
  });
  assert(missingSignature.status === 400, `missing signature expected 400, got ${missingSignature.status}`);

  const badSignature = await request("/api/stripe/webhook", {
    method: "POST",
    raw: "{}",
    signature: "t=1,v1=bad",
  });
  assert(badSignature.status === 400, `bad signature expected 400, got ${badSignature.status}`);

  const successPage = await request(
    `/payments/success?session_id=${payment.stripeCheckoutSessionId}&status=SUCCEEDED`,
    { jar: customerJar },
  );
  assert(successPage.status === 200, `success page failed ${successPage.status}`);
  assert(!successPage.text.includes("Stripe confirmed this payment."), "success page marked the payment confirmed");
  const stillPending = await prisma.payment.findUnique({ where: { id: payment.id } });
  assert(stillPending.status === "PENDING", "browser redirect changed payment status");

  const paidEvent = {
    id: `evt_paid_${stamp}`,
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: payment.stripeCheckoutSessionId,
        object: "checkout.session",
        payment_status: "paid",
        metadata: { paymentId: payment.id, jobId },
        payment_intent: `pi_test_${stamp}`,
      },
    },
  };
  const paid = await postEvent(secret, paidEvent);
  assert(paid.status === 200, `paid webhook failed ${paid.status} ${paid.text}`);
  const paidRow = await prisma.payment.findUnique({ where: { id: payment.id } });
  assert(paidRow.status === "SUCCEEDED", "paid webhook did not mark the payment succeeded");
  assert(paidRow.amount.toString().startsWith("250.5"), "payment amount was not the server amount");

  const repeated = await postEvent(secret, paidEvent);
  assert(repeated.status === 200 && repeated.json.duplicate === true, `repeat expected duplicate, got ${repeated.text}`);
  const eventCount = await prisma.stripeWebhookEvent.count({ where: { id: paidEvent.id } });
  assert(eventCount === 1, "repeated webhook stored another event");

  const failedPayment = await prisma.payment.create({
    data: {
      jobId: (await prisma.job.create({
        data: {
          title: "Failed payment job",
          description: "Used only to test a failed webhook.",
          budget: "40",
          location: "College Park, MD",
          status: "ASSIGNED",
          customerId: customer.id,
          contractorId: profile.json.profile.id,
        },
      })).id,
      customerId: customer.id,
      contractorId: profile.json.profile.id,
      amount: "40.00",
      currency: "usd",
      stripeCheckoutSessionId: `cs_fail_${stamp}`,
    },
  });
  const failed = await postEvent(secret, {
    id: `evt_fail_${stamp}`,
    object: "event",
    type: "checkout.session.async_payment_failed",
    data: {
      object: {
        id: failedPayment.stripeCheckoutSessionId,
        object: "checkout.session",
        metadata: { paymentId: failedPayment.id },
      },
    },
  });
  assert(failed.status === 200, `failed webhook ${failed.status} ${failed.text}`);
  const failedRow = await prisma.payment.findUnique({ where: { id: failedPayment.id } });
  assert(failedRow.status === "FAILED", "failed webhook did not mark the payment failed");

  const cancelledPayment = await prisma.payment.create({
    data: {
      jobId: (await prisma.job.create({
        data: {
          title: "Cancelled payment job",
          description: "Used only to test an expired checkout.",
          budget: "60",
          location: "College Park, MD",
          status: "ASSIGNED",
          customerId: customer.id,
          contractorId: profile.json.profile.id,
        },
      })).id,
      customerId: customer.id,
      contractorId: profile.json.profile.id,
      amount: "60.00",
      currency: "usd",
      stripeCheckoutSessionId: `cs_cancel_${stamp}`,
    },
  });
  const cancelled = await postEvent(secret, {
    id: `evt_cancel_${stamp}`,
    object: "event",
    type: "checkout.session.expired",
    data: {
      object: {
        id: cancelledPayment.stripeCheckoutSessionId,
        object: "checkout.session",
        metadata: { paymentId: cancelledPayment.id },
      },
    },
  });
  assert(cancelled.status === 200, `cancel webhook ${cancelled.status} ${cancelled.text}`);
  const cancelledRow = await prisma.payment.findUnique({ where: { id: cancelledPayment.id } });
  assert(cancelledRow.status === "CANCELLED", "expired checkout was not cancelled");

  const protectedPaid = await postEvent(secret, {
    id: `evt_expire_paid_${stamp}`,
    object: "event",
    type: "checkout.session.expired",
    data: {
      object: {
        id: payment.stripeCheckoutSessionId,
        object: "checkout.session",
        metadata: { paymentId: payment.id },
      },
    },
  });
  assert(protectedPaid.status === 200, `expire after pay ${protectedPaid.text}`);
  const stillPaid = await prisma.payment.findUnique({ where: { id: payment.id } });
  assert(stillPaid.status === "SUCCEEDED", "a later expired event undid a successful payment");

  console.log("phase 7 payment checks passed");
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
