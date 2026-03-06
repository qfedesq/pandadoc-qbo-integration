import { compare, hash } from "bcryptjs";

import { createOpaqueToken } from "@/lib/security/hash";

export async function hashPassword(password: string) {
  return hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export async function createUnavailablePasswordHash() {
  return hashPassword(createOpaqueToken(48));
}
