import { createRequire } from "node:module";
import { PrismaClient, UserRole, JobStatus, BidStatus } from "@prisma/client";

const require = createRequire(import.meta.url);
const { hash } = require("bcrypt");

const prisma = new PrismaClient();
const PASSWORD = "Test1234!";
const SALT_ROUNDS = 12;

async function upsertUser(email, role, passwordHash) {
  return prisma.user.upsert({
    where: { email },
    update: { role, password: passwordHash, deactivatedAt: null },
    create: { email, role, password: passwordHash },
  });
}

async function main() {
  const passwordHash = await hash(PASSWORD, SALT_ROUNDS);

  const customer1 = await upsertUser("customer@test.com", UserRole.CUSTOMER, passwordHash);
  const customer2 = await upsertUser("customer2@test.com", UserRole.CUSTOMER, passwordHash);
  const contractorUser1 = await upsertUser("plumber@test.com", UserRole.CONTRACTOR, passwordHash);
  const contractorUser2 = await upsertUser("electrician@test.com", UserRole.CONTRACTOR, passwordHash);
  const contractorUser3 = await upsertUser("hvac@test.com", UserRole.CONTRACTOR, passwordHash);

  const plumber = await prisma.contractorProfile.upsert({
    where: { userId: contractorUser1.id },
    update: {
      companyName: "Rockville Plumbing Pros",
      trade: "Plumbing",
      bio: "Licensed plumber serving Montgomery County. Water heaters, drain cleaning, and bathroom remodeling.",
      hourlyRate: 95,
      yearsExperience: 12,
      city: "Rockville",
      state: "MD",
      skills: ["plumbing", "pipe repair", "drain cleaning", "water heater"],
      serviceCategories: ["plumbing repair", "bathroom remodeling"],
      serviceRadiusMiles: 35,
      availability: "this_week",
      verified: true,
      identityAttestedAt: new Date(),
      licenseAttestedAt: new Date(),
      insuranceAttestedAt: new Date(),
    },
    create: {
      userId: contractorUser1.id,
      companyName: "Rockville Plumbing Pros",
      trade: "Plumbing",
      bio: "Licensed plumber serving Montgomery County. Water heaters, drain cleaning, and bathroom remodeling.",
      hourlyRate: 95,
      yearsExperience: 12,
      city: "Rockville",
      state: "MD",
      skills: ["plumbing", "pipe repair", "drain cleaning", "water heater"],
      serviceCategories: ["plumbing repair", "bathroom remodeling"],
      serviceRadiusMiles: 35,
      availability: "this_week",
      verified: true,
      identityAttestedAt: new Date(),
      licenseAttestedAt: new Date(),
      insuranceAttestedAt: new Date(),
    },
  });

  const electrician = await prisma.contractorProfile.upsert({
    where: { userId: contractorUser2.id },
    update: {
      companyName: "Capital Electric Co",
      trade: "Electrical",
      bio: "Residential electrician for panel upgrades, lighting, and troubleshooting across MD/VA.",
      hourlyRate: 110,
      yearsExperience: 9,
      city: "Bethesda",
      state: "MD",
      skills: ["electrical", "wiring", "panel upgrade", "lighting"],
      serviceCategories: ["electrical repair"],
      serviceRadiusMiles: 50,
      availability: "asap",
      verified: true,
    },
    create: {
      userId: contractorUser2.id,
      companyName: "Capital Electric Co",
      trade: "Electrical",
      bio: "Residential electrician for panel upgrades, lighting, and troubleshooting across MD/VA.",
      hourlyRate: 110,
      yearsExperience: 9,
      city: "Bethesda",
      state: "MD",
      skills: ["electrical", "wiring", "panel upgrade", "lighting"],
      serviceCategories: ["electrical repair"],
      serviceRadiusMiles: 50,
      availability: "asap",
      verified: true,
    },
  });

  const hvac = await prisma.contractorProfile.upsert({
    where: { userId: contractorUser3.id },
    update: {
      companyName: "Arlington Air & Heat",
      trade: "HVAC",
      bio: "HVAC install and service. Furnaces, AC, and ductwork for Northern Virginia homes.",
      hourlyRate: 120,
      yearsExperience: 15,
      city: "Arlington",
      state: "VA",
      skills: ["hvac", "furnace", "air conditioning", "ductwork"],
      serviceCategories: ["hvac service"],
      serviceRadiusMiles: 40,
      availability: "next_week",
      verified: false,
    },
    create: {
      userId: contractorUser3.id,
      companyName: "Arlington Air & Heat",
      trade: "HVAC",
      bio: "HVAC install and service. Furnaces, AC, and ductwork for Northern Virginia homes.",
      hourlyRate: 120,
      yearsExperience: 15,
      city: "Arlington",
      state: "VA",
      skills: ["hvac", "furnace", "air conditioning", "ductwork"],
      serviceCategories: ["hvac service"],
      serviceRadiusMiles: 40,
      availability: "next_week",
      verified: false,
    },
  });

  // Clear prior seeded jobs for these customers so reruns stay tidy
  await prisma.job.deleteMany({
    where: {
      customerId: { in: [customer1.id, customer2.id] },
      title: {
        in: [
          "Replace kitchen faucet and shutoff valves",
          "Panel upgrade for EV charger",
          "AC not cooling upstairs",
          "Bathroom remodel plumbing rough-in",
        ],
      },
    },
  });

  const job1 = await prisma.job.create({
    data: {
      title: "Replace kitchen faucet and shutoff valves",
      description:
        "Need a plumber to replace an old kitchen faucet and the two shutoff valves under the sink. Prefer someone available this week.",
      budget: 350,
      location: "Rockville, MD",
      city: "Rockville",
      state: "MD",
      status: JobStatus.OPEN,
      customerId: customer1.id,
      requiredSkills: ["plumbing", "pipe repair"],
      projectType: "plumbing repair",
      experienceLevel: "intermediate",
      availabilityNeeded: "this_week",
    },
  });

  const job2 = await prisma.job.create({
    data: {
      title: "Panel upgrade for EV charger",
      description:
        "Looking for an electrician to upgrade a 100A panel to 200A and install a circuit for a Level 2 EV charger in the garage.",
      budget: 2800,
      location: "Bethesda, MD",
      city: "Bethesda",
      state: "MD",
      status: JobStatus.BIDDING,
      customerId: customer1.id,
      requiredSkills: ["electrical", "panel upgrade", "wiring"],
      projectType: "electrical repair",
      experienceLevel: "expert",
      availabilityNeeded: "this_month",
    },
  });

  const job3 = await prisma.job.create({
    data: {
      title: "AC not cooling upstairs",
      description:
        "Central AC runs but upstairs rooms stay warm. Need diagnosis and repair. House is about 2,200 sq ft.",
      budget: 450,
      location: "Arlington, VA",
      city: "Arlington",
      state: "VA",
      status: JobStatus.OPEN,
      customerId: customer2.id,
      requiredSkills: ["hvac", "air conditioning"],
      projectType: "hvac service",
      experienceLevel: "any",
      availabilityNeeded: "asap",
    },
  });

  const job4 = await prisma.job.create({
    data: {
      title: "Bathroom remodel plumbing rough-in",
      description:
        "Gut renovation of a hall bathroom. Need plumbing rough-in for new tub, vanity, and toilet. Drywall already open.",
      budget: 2200,
      location: "Rockville, MD",
      city: "Rockville",
      state: "MD",
      status: JobStatus.OPEN,
      customerId: customer2.id,
      requiredSkills: ["plumbing", "pipe repair"],
      projectType: "bathroom remodeling",
      experienceLevel: "advanced",
      availabilityNeeded: "next_week",
    },
  });

  await prisma.bid.createMany({
    data: [
      {
        jobId: job1.id,
        contractorId: plumber.id,
        amount: 275,
        message: "I can replace the faucet and valves this week. Includes parts if you want Moen.",
        estimatedDuration: "2-3 hours",
        status: BidStatus.PENDING,
      },
      {
        jobId: job2.id,
        contractorId: electrician.id,
        amount: 2650,
        message: "Full panel upgrade and EV circuit. Permits included for Montgomery County.",
        estimatedDuration: "1-2 days",
        status: BidStatus.PENDING,
      },
      {
        jobId: job3.id,
        contractorId: hvac.id,
        amount: 395,
        message: "Diagnostic visit plus common refrigerant/coil fixes if needed.",
        estimatedDuration: "2-4 hours",
        status: BidStatus.PENDING,
      },
      {
        jobId: job4.id,
        contractorId: plumber.id,
        amount: 1950,
        message: "Rough-in for tub, vanity, and toilet. Can start next week.",
        estimatedDuration: "2 days",
        status: BidStatus.PENDING,
      },
    ],
  });

  for (const job of [job1, job2, job3, job4]) {
    await prisma.jobRequirements.upsert({
      where: { jobId: job.id },
      update: {
        requiredSkills: job.requiredSkills,
        projectType: job.projectType,
        experienceLevel: job.experienceLevel,
        budgetMin: job.budget,
        budgetMax: job.budget,
        locationText: job.location,
        availabilityHint: job.availabilityNeeded,
        extractionStatus: "READY",
        extractedAt: new Date(),
      },
      create: {
        jobId: job.id,
        requiredSkills: job.requiredSkills,
        projectType: job.projectType,
        experienceLevel: job.experienceLevel,
        budgetMin: job.budget,
        budgetMax: job.budget,
        locationText: job.location,
        availabilityHint: job.availabilityNeeded,
        extractionStatus: "READY",
        extractedAt: new Date(),
      },
    });
  }

  console.log("Seeded test data.\n");
  console.log("Login accounts (password for all):", PASSWORD);
  console.log("  customer@test.com       (CUSTOMER)");
  console.log("  customer2@test.com      (CUSTOMER)");
  console.log("  plumber@test.com        (CONTRACTOR - Rockville, MD)");
  console.log("  electrician@test.com    (CONTRACTOR - Bethesda, MD)");
  console.log("  hvac@test.com           (CONTRACTOR - Arlington, VA)");
  console.log("\nJobs:", job1.title, "|", job2.title, "|", job3.title, "|", job4.title);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
