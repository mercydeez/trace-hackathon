import type { Metadata, Viewport } from "next";
import "@fontsource-variable/literata/wght.css";
import "@fontsource-variable/literata/wght-italic.css";
import "@fontsource-variable/atkinson-hyperlegible-next/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "TRACE — Research you can defend",
  description:
    "Find real sources, inspect the evidence, approve its use, and export a citation-backed brief with an honest AI-use disclosure.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
