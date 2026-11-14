import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TicketForge AI Backend",
  description: "TicketForge AI REST API",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
