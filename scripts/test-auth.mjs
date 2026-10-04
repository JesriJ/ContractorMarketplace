const base = process.env.APP_URL ?? "http://localhost:3000";

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    redirect: "manual",
    ...options,
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

async function main() {
  const badEmail = await request("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "not-an-email",
      password: "password123",
      confirmPassword: "password123",
      role: "CUSTOMER",
    }),
  });
  console.log("invalid-email", badEmail.status, badEmail.json);

  const shortPassword = await request("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "person@example.com",
      password: "short",
      confirmPassword: "short",
      role: "CUSTOMER",
    }),
  });
  console.log("short-password", shortPassword.status, shortPassword.json);

  const mismatch = await request("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "person@example.com",
      password: "password123",
      confirmPassword: "password124",
      role: "CUSTOMER",
    }),
  });
  console.log("password-mismatch", mismatch.status, mismatch.json);

  const fakeRole = await request("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "person@example.com",
      password: "password123",
      confirmPassword: "password123",
      role: "ADMIN",
    }),
  });
  console.log("invalid-role", fakeRole.status, fakeRole.json);

  const dashboard = await request("/dashboard");
  console.log("dashboard-unauthenticated", dashboard.status, dashboard.location);

  const createJob = await request("/jobs/create");
  console.log("create-job-unauthenticated", createJob.status, createJob.location);

  const login = await request("/login");
  console.log("login-page", login.status);

  const register = await request("/register");
  console.log("register-page", register.status);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
