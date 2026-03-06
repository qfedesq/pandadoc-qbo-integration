import { z } from "zod";

export const pandaDocTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.coerce.number(),
  refresh_expires_in: z.coerce.number().optional(),
  token_type: z.string(),
  scope: z.string().optional(),
});

export const pandaDocCurrentMemberSchema = z
  .object({
    id: z.string().optional(),
    user_id: z.string().optional(),
    membership_id: z.string().optional(),
    email: z.string().email().optional(),
    first_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
    workspace_id: z.string().optional().nullable(),
    workspace_name: z.string().optional().nullable(),
  })
  .passthrough();

export const pandaDocDocumentRecipientSchema = z
  .object({
    email: z.string().email(),
    first_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
    role: z.string(),
  })
  .passthrough();

export const pandaDocDocumentTokenSchema = z
  .object({
    name: z.string(),
    value: z.string(),
  })
  .passthrough();

export const pandaDocCreateDocumentResponseSchema = z
  .object({
    id: z.string(),
    name: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
  })
  .passthrough();

export const pandaDocDocumentDetailsSchema = z
  .object({
    id: z.string(),
    name: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    date_created: z.string().optional().nullable(),
    date_modified: z.string().optional().nullable(),
    recipients: z.array(pandaDocDocumentRecipientSchema).optional(),
    metadata: z.record(z.string(), z.string()).optional().nullable(),
  })
  .passthrough();

export const pandaDocWebhookEventSchema = z
  .object({
    event: z.string().optional().nullable(),
    type: z.string().optional().nullable(),
    event_type: z.string().optional().nullable(),
    id: z.string().optional().nullable(),
    data: z.record(z.string(), z.unknown()).optional().nullable(),
  })
  .passthrough();

export type PandaDocTokenResponse = z.infer<typeof pandaDocTokenResponseSchema>;
export type PandaDocCurrentMember = z.infer<typeof pandaDocCurrentMemberSchema>;
export type PandaDocDocumentRecipient = z.infer<
  typeof pandaDocDocumentRecipientSchema
>;
export type PandaDocDocumentToken = z.infer<typeof pandaDocDocumentTokenSchema>;
export type PandaDocCreateDocumentResponse = z.infer<
  typeof pandaDocCreateDocumentResponseSchema
>;
export type PandaDocDocumentDetails = z.infer<
  typeof pandaDocDocumentDetailsSchema
>;
export type PandaDocWebhookEvent = z.infer<typeof pandaDocWebhookEventSchema>;
