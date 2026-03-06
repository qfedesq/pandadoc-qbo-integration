import { z } from "zod";

const numericStringSchema = z.union([z.string(), z.number()]).transform(Number);

export const quickBooksTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.coerce.number(),
  x_refresh_token_expires_in: z.coerce.number().optional(),
  token_type: z.string(),
  scope: z.string().optional(),
});

export const quickBooksCompanyResponseSchema = z.object({
  CompanyInfo: z
    .object({
      Id: z.union([z.string(), z.number()]).transform(String),
      CompanyName: z.string().optional().nullable(),
      Country: z.string().optional().nullable(),
      CurrencyRef: z
        .object({
          value: z.string().optional().nullable(),
          name: z.string().optional().nullable(),
        })
        .optional()
        .nullable(),
    })
    .passthrough(),
});

export const quickBooksInvoiceSchema = z
  .object({
    Id: z.union([z.string(), z.number()]).transform(String),
    DocNumber: z.string().optional().nullable(),
    TotalAmt: numericStringSchema,
    Balance: numericStringSchema,
    DueDate: z.string().optional().nullable(),
    TxnDate: z.string().optional().nullable(),
    CurrencyRef: z
      .object({
        value: z.string().optional().nullable(),
        name: z.string().optional().nullable(),
      })
      .optional()
      .nullable(),
    CustomerRef: z
      .object({
        value: z.string().optional().nullable(),
        name: z.string().optional().nullable(),
      })
      .optional()
      .nullable(),
    BillEmail: z
      .object({
        Address: z.string().optional().nullable(),
      })
      .optional()
      .nullable(),
    MetaData: z
      .object({
        CreateTime: z.string().optional().nullable(),
        LastUpdatedTime: z.string().optional().nullable(),
      })
      .optional()
      .nullable(),
  })
  .passthrough();

export const quickBooksQueryResponseSchema = z.object({
  QueryResponse: z
    .object({
      Invoice: z.array(quickBooksInvoiceSchema).optional(),
      startPosition: z.union([z.string(), z.number()]).optional(),
      maxResults: z.union([z.string(), z.number()]).optional(),
    })
    .passthrough(),
});

export type QuickBooksTokenResponse = z.infer<
  typeof quickBooksTokenResponseSchema
>;
export type QuickBooksCompanyResponse = z.infer<
  typeof quickBooksCompanyResponseSchema
>;
export type QuickBooksInvoice = z.infer<typeof quickBooksInvoiceSchema>;
