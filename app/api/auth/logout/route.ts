import { NextResponse } from "next/server";

import { destroyCurrentSession } from "@/lib/auth/session";
import { assertValidAppRequestOrigin } from "@/lib/security/origin";
import { getPublicError } from "@/lib/utils/errors";

export async function POST(request: Request) {
  try {
    assertValidAppRequestOrigin(request);
    await destroyCurrentSession();
    return NextResponse.redirect(new URL("/login", request.url), 303);
  } catch (error) {
    const publicError = getPublicError(error);
    return NextResponse.json(
      { error: publicError.message, code: publicError.code },
      { status: publicError.statusCode },
    );
  }
}
