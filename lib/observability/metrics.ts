import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logging/logger";

export async function incrementMetric(
  name: string,
  scope = "global",
  amount = 1,
) {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  try {
    await prisma.metricCounter.upsert({
      where: {
        name_scope: {
          name,
          scope,
        },
      },
      create: {
        name,
        scope,
        count: amount,
      },
      update: {
        count: {
          increment: amount,
        },
      },
    });
  } catch (error) {
    logger.warn("metrics.increment_failed", { name, scope, error });
  }
}
