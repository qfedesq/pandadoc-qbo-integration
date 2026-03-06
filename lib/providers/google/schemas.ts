import { z } from "zod";

const booleanLikeSchema = z
  .union([z.boolean(), z.string()])
  .transform((value) => value === true || value === "true");

export const googleTokenResponseSchema = z
  .object({
    access_token: z.string(),
    expires_in: z.coerce.number(),
    scope: z.string().optional(),
    token_type: z.string(),
    id_token: z.string().optional(),
  })
  .passthrough();

export const googleUserInfoSchema = z
  .object({
    sub: z.string(),
    email: z.string().email(),
    email_verified: booleanLikeSchema,
    name: z.string().optional().nullable(),
    given_name: z.string().optional().nullable(),
    family_name: z.string().optional().nullable(),
    picture: z.string().url().optional().nullable(),
    locale: z.string().optional().nullable(),
    hd: z.string().optional().nullable(),
  })
  .passthrough();

export type GoogleTokenResponse = z.infer<typeof googleTokenResponseSchema>;
export type GoogleUserInfo = z.infer<typeof googleUserInfoSchema>;
