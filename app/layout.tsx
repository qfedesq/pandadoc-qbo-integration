import type { Metadata } from "next";
import { IBM_Plex_Sans, Space_Grotesk } from "next/font/google";

import { AppVersionBadge } from "@/components/app-version-badge";
import { APP_DISPLAY_VERSION } from "@/lib/app-version";

import "./globals.css";

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
});

const bodyFont = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: `PandaDoc Working Capital Demo ${APP_DISPLAY_VERSION}`,
  description:
    "Embedded working capital demo for PandaDoc with QuickBooks invoice sync, capital offers, withdrawals, repayment tracking, and operator visibility.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body className="font-[var(--font-body)]">
        {children}
        <AppVersionBadge />
      </body>
    </html>
  );
}
