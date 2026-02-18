import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Raya Kuih Seller Platform",
  description: "Seasonal SaaS for Raya kuih sellers",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
