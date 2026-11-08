import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "RAINY Agent CRM", description: "Agent contacts, consent-first outreach and campaign analytics." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="mn"><body>{children}</body></html>;
}
