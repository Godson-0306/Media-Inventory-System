import { PrismaClient, SubscriptionStatus } from "@prisma/client";

const TRIAL_DAYS = 14;
const prisma = new PrismaClient();

async function main() {
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const result = await prisma.organization.updateMany({
    data: {
      subscriptionStatus: SubscriptionStatus.TRIAL,
      trialEndsAt,
    },
  });
  console.log(
    `Reset ${result.count} organization(s) to a ${TRIAL_DAYS}-day trial ending ${trialEndsAt.toISOString()}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
