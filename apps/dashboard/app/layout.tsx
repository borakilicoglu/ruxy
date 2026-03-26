import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import { DashboardFrame } from "@/components/dashboard-frame";
import { DashboardToastProvider } from "@/components/dashboard-toast-provider";

import "./globals.css";

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Ruxy Operations",
  description: "Proxy pool control surface for Ruxy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={monoFont.variable}
        style={{
          fontFamily: "var(--font-mono), monospace",
        }}
      >
        <DashboardToastProvider />
        <DashboardFrame>{children}</DashboardFrame>
      </body>
    </html>
  );
}
