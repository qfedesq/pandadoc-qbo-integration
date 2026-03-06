import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string, currency = "USD") {
  const numeric = typeof amount === "number" ? amount : Number(amount);
  const safeAmount = Number.isFinite(numeric) ? numeric : 0;
  const normalizedCurrency = currency.toUpperCase();

  if (/^[A-Z]{3}$/.test(normalizedCurrency)) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeAmount);
  }

  return `${new Intl.NumberFormat("en-US", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount)} ${normalizedCurrency}`;
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) {
    return "—";
  }

  const parsed = typeof date === "string" ? new Date(date) : date;
  return format(parsed, "MMM d, yyyy");
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) {
    return "—";
  }

  const parsed = typeof date === "string" ? new Date(date) : date;
  return format(parsed, "MMM d, yyyy h:mm a");
}

export function toDateOnly(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
