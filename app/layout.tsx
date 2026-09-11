import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Triage Health | Your health, with context",
  description: "An educational health assistant with source-backed conversations, a personal health profile, and a curated public-health library.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
