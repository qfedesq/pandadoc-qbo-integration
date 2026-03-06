import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logging/logger";
import { sha256 } from "@/lib/security/hash";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();
let lastCleanupAt = 0;

function getBucketWindow(nowMs: number, windowMs: number) {
  const bucketStartMs = nowMs - (nowMs % windowMs);

  return {
    bucketStart: new Date(bucketStartMs),
    resetAt: bucketStartMs + windowMs,
  };
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function cleanupExpiredRateLimitBuckets(now: Date) {
  if (now.getTime() - lastCleanupAt < 5 * 60_000) {
    return;
  }

  lastCleanupAt = now.getTime();

  prisma.rateLimitBucket
    .deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    })
    .catch((error) => logger.warn("rate_limit.cleanup_failed", { error }));
}

function enforceInMemoryRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  const current = store.get(input.key);

  if (!current || current.resetAt <= now) {
    store.set(input.key, {
      count: 1,
      resetAt: now + input.windowMs,
    });

    return {
      allowed: true,
      remaining: input.limit - 1,
      resetAt: now + input.windowMs,
    };
  }

  if (current.count >= input.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt,
    };
  }

  current.count += 1;
  store.set(input.key, current);

  return {
    allowed: true,
    remaining: input.limit - current.count,
    resetAt: current.resetAt,
  };
}

export async function enforceRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  if (process.env.NODE_ENV === "test") {
    return enforceInMemoryRateLimit(input);
  }

  const now = new Date();
  const { bucketStart, resetAt } = getBucketWindow(now.getTime(), input.windowMs);
  const keyHash = sha256(input.key);

  try {
    await cleanupExpiredRateLimitBuckets(now);

    return await prisma.$transaction(async (tx) => {
      try {
        await tx.rateLimitBucket.create({
          data: {
            keyHash,
            bucketStart,
            expiresAt: new Date(resetAt),
            count: 1,
          },
        });

        return {
          allowed: true,
          remaining: input.limit - 1,
          resetAt,
        };
      } catch (error) {
        if (!isUniqueConstraintError(error)) {
          throw error;
        }
      }

      const updated = await tx.rateLimitBucket.updateMany({
        where: {
          keyHash,
          bucketStart,
          count: {
            lt: input.limit,
          },
        },
        data: {
          count: {
            increment: 1,
          },
          expiresAt: new Date(resetAt),
        },
      });

      const bucket = await tx.rateLimitBucket.findUnique({
        where: {
          keyHash_bucketStart: {
            keyHash,
            bucketStart,
          },
        },
        select: {
          count: true,
          expiresAt: true,
        },
      });

      if (!bucket) {
        throw new Error("Rate limit bucket not found after update.");
      }

      return {
        allowed: updated.count === 1,
        remaining: Math.max(input.limit - bucket.count, 0),
        resetAt: bucket.expiresAt.getTime(),
      };
    });
  } catch (error) {
    logger.warn("rate_limit.database_fallback", {
      keyHash,
      error,
    });
    return enforceInMemoryRateLimit(input);
  }
}

export function getRequestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}
