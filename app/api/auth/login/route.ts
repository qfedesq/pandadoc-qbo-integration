import { NextResponse } from "next/server";

import { loginSchema } from "@/lib/auth/schemas";
import { createSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/passwords";
import { prisma } from "@/lib/db/prisma";
import { assertSecureAdminConfiguration } from "@/lib/env";
import { logger } from "@/lib/logging/logger";
import { assertValidAppRequestOrigin } from "@/lib/security/origin";
import { enforceRateLimit, getRequestIp } from "@/lib/security/rate-limit";
import { getPublicError } from "@/lib/utils/errors";

export async function POST(request: Request) {
  try {
    assertSecureAdminConfiguration();
    assertValidAppRequestOrigin(request);

    const ip = getRequestIp(request);
    const rateLimit = await enforceRateLimit({
      key: `auth:login:${ip}`,
      limit: 10,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please wait a minute." },
        { status: 429 },
      );
    }

    const payload = loginSchema.parse(await request.json());
    const user = await prisma.user.findUnique({
      where: {
        email: payload.email.toLowerCase(),
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const passwordIsValid = await verifyPassword(payload.password, user.passwordHash);

    if (!passwordIsValid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    await createSession(user.id);

    return NextResponse.json({
      ok: true,
      redirectTo: "/factoring-dashboard",
    });
  } catch (error) {
    logger.error("auth.login_failed", { error });
    const publicError = getPublicError(error);
    return NextResponse.json(
      { error: publicError.message, code: publicError.code },
      { status: publicError.statusCode },
    );
  }
}
