CREATE TYPE "AuthIdentityProvider" AS ENUM ('GOOGLE');

CREATE TABLE "AuthLoginState" (
  "id" TEXT NOT NULL,
  "provider" "AuthIdentityProvider" NOT NULL,
  "state" TEXT NOT NULL,
  "redirectTo" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthLoginState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserIdentity" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" "AuthIdentityProvider" NOT NULL,
  "providerUserId" TEXT NOT NULL,
  "email" TEXT,
  "displayName" TEXT,
  "avatarUrl" TEXT,
  "profile" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserIdentity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuthLoginState_state_key" ON "AuthLoginState"("state");
CREATE INDEX "AuthLoginState_provider_expiresAt_idx" ON "AuthLoginState"("provider", "expiresAt");

CREATE UNIQUE INDEX "UserIdentity_provider_providerUserId_key" ON "UserIdentity"("provider", "providerUserId");
CREATE INDEX "UserIdentity_userId_provider_idx" ON "UserIdentity"("userId", "provider");

ALTER TABLE "UserIdentity"
  ADD CONSTRAINT "UserIdentity_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
