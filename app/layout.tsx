import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Decision Monte Carlo",
  description: "Prototype: Monte Carlo decision probability with toggleable assumptions",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
