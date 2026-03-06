import mockOutstandingInvoices from "@/mock-data/quickbooks/outstanding-invoices-response.json";

import {
  quickBooksQueryResponseSchema,
  type QuickBooksInvoice,
} from "./schemas";

export const QUICKBOOKS_MOCK_REALM_ID = "mock-realm-9130357992222222";
export const QUICKBOOKS_DEMO_COMPANY_NAME = "QuickBooks Demo Company";

const parsedMockInvoices = quickBooksQueryResponseSchema.parse(
  mockOutstandingInvoices,
);

export function getMockQuickBooksCompanyInfo() {
  return {
    realmId: QUICKBOOKS_MOCK_REALM_ID,
    companyName: QUICKBOOKS_DEMO_COMPANY_NAME,
    country: "US",
    currency: "USD",
  };
}

export function getQuickBooksConnectionDisplayName(
  connection:
    | {
        externalAccountId?: string | null;
        externalAccountName?: string | null;
      }
    | null
    | undefined,
) {
  if (!connection) {
    return null;
  }

  if (connection.externalAccountId === QUICKBOOKS_MOCK_REALM_ID) {
    return QUICKBOOKS_DEMO_COMPANY_NAME;
  }

  return connection.externalAccountName ?? null;
}

export function getMockQuickBooksInvoices() {
  return [...(parsedMockInvoices.QueryResponse.Invoice ?? [])] as QuickBooksInvoice[];
}
