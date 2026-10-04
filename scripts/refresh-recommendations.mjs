import { PrismaClient, JobStatus } from "@prisma/client";

const prisma = new PrismaClient();

function skillScore(required, owned) {
  if (!required.length) return 0.55;
  const matched = required.filter((skill) =>
    owned.some((item) => item.includes(skill) || skill.includes(item)),
  ).length;
  return matched / required.length;
}

function scorePair(job, requirements, contractor, rating) {
  const owned = [
    ...contractor.skills,
    ...contractor.serviceCategories,
    contractor.trade.toLowerCase(),
  ].map((value) => value.toLowerCase());
  const required = requirements.requiredSkills.map((value) => value.toLowerCase());
  const skill = skillScore(required, owned);
  const experience = Math.min(1, contractor.yearsExperience / 5);
  const sameState = job.location.toUpperCase().includes(contractor.state.toUpperCase());
  const location = sameState ? 0.9 : 0.35;
  const availability = contractor.availabilityNotes ? 0.8 : 0.55;
  const ratingScore = rating == null ? 0.55 : Math.min(1, rating / 5);
  const price = 0.7;
  const total =
    skill * 0.35 + experience * 0.2 + location * 0.15 + availability * 0.1 + ratingScore * 0.1 + price * 0.1;
  const score = Math.round(total * 1000) / 10;
  const reasons = [
    `Matches ${Math.round(skill * required.length)}/${required.length || 0} required skills`,
    `${contractor.yearsExperience} years of experience`,
  ];
  if (sameState) reasons.push("Within preferred service area");
  if (rating != null) reasons.push(`${rating.toFixed(1)}/5 rating from reviews`);
  return { score, reasons, breakdown: { skill: Math.round(skill * 100), experience: Math.round(experience * 100) } };
}

async function main() {
  const jobs = await prisma.job.findMany({
    where: { status: { in: [JobStatus.OPEN, JobStatus.BIDDING] } },
    include: { requirements: true },
    take: 100,
    orderBy: { updatedAt: "desc" },
  });
  const contractors = await prisma.contractorProfile.findMany();
  const ratings = await prisma.review.groupBy({
    by: ["contractorId"],
    _avg: { rating: true },
  });
  const ratingMap = new Map(ratings.map((row) => [row.contractorId, row._avg.rating]));

  let written = 0;
  for (const job of jobs) {
    if (!job.requirements) continue;
    const rows = [];
    for (const contractor of contractors) {
      const sameState = job.location.toUpperCase().includes(contractor.state.toUpperCase());
      if (!sameState && contractor.serviceRadiusMiles < 100) continue;
      const result = scorePair(job, job.requirements, contractor, ratingMap.get(contractor.id) ?? null);
      rows.push({
        jobId: job.id,
        contractorId: contractor.id,
        score: result.score,
        breakdown: result.breakdown,
        reasons: result.reasons,
        computedAt: new Date(),
        updatedAt: new Date(),
      });
    }
    rows.sort((a, b) => b.score - a.score);
    const top = rows.slice(0, 50);
    await prisma.jobRecommendation.deleteMany({ where: { jobId: job.id } });
    if (top.length) {
      await prisma.jobRecommendation.createMany({ data: top });
      written += top.length;
    }
  }
  console.log(JSON.stringify({ jobs: jobs.length, recommendationsWritten: written }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
