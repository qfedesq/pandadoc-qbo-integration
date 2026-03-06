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
  title: `Protofire Factoring Dashboard ${APP_DISPLAY_VERSION}`,
  description:
    "Protofire-branded PandaDoc and QuickBooks factoring workspace with invoice sync, withdraw-capital flows, Arena StaFi-ready settlement simulation, and scheduled refresh.",
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
