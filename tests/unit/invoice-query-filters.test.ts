import { InvoiceStatus } from "@prisma/client";

import { buildImportedInvoiceWhereInput } from "@/lib/db/invoices";

describe("buildImportedInvoiceWhereInput", () => {
  it("applies overdue-only as an additional constraint instead of overwriting status", () => {
    expect(
      buildImportedInvoiceWhereInput({
        userId: "user_1",
        status: InvoiceStatus.OPEN,
        overdueOnly: true,
      }),
    ).toEqual({
      AND: [
        { userId: "user_1" },
        { normalizedStatus: InvoiceStatus.OPEN },
        { normalizedStatus: InvoiceStatus.OVERDUE },
      ],
    });
  });

  it("adds case-insensitive search across invoice id, number, and counterparty", () => {
    expect(
      buildImportedInvoiceWhereInput({
        userId: "user_1",
        search: "acme",
      }),
    ).toEqual({
      AND: [
        { userId: "user_1" },
        {
          OR: [
            {
              providerInvoiceId: {
                contains: "acme",
                mode: "insensitive",
              },
            },
            {
              counterpartyName: {
                contains: "acme",
                mode: "insensitive",
              },
            },
            {
              docNumber: {
                contains: "acme",
                mode: "insensitive",
              },
            },
          ],
        },
      ],
    });
  });
});
