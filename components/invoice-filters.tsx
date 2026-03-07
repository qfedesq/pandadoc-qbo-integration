import { InvoiceStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function InvoiceFilters({
  search,
  status,
  overdueOnly,
}: {
  search?: string;
  status?: string;
  overdueOnly?: boolean;
}) {
  return (
    <form
      className="grid gap-3 rounded-[1.25rem] border border-border/80 bg-card/90 p-4 md:grid-cols-[2fr_1fr_auto_auto]"
      role="search"
    >
      <Input
        aria-label="Search invoices"
        name="q"
        defaultValue={search}
        placeholder="Search by invoice ID, number, or counterparty"
      />
      <Select
        aria-label="Filter by invoice status"
        name="status"
        defaultValue={status ?? "ALL"}
      >
        <option value="ALL">All statuses</option>
        {Object.values(InvoiceStatus).map((value) => (
          <option key={value} value={value}>
            {value.replace(/_/g, " ")}
          </option>
        ))}
      </Select>
      <label className="flex items-center gap-2 rounded-xl border border-border/80 bg-background/40 px-4 text-sm font-medium text-foreground">
        <input
          defaultChecked={overdueOnly}
          name="overdue"
          type="checkbox"
          value="true"
        />
        Show only overdue
      </label>
      <Button type="submit" variant="secondary">
        Apply filters
      </Button>
    </form>
  );
}
