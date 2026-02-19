import type { Metadata } from "next";
import "./globals.css";

const title = "BazaarBah – AI-Powered Digital Bazaar for Local Sellers";
const description =
  "Create your own QR-powered shop in minutes. Accept payments, manage orders, and generate AI product photos & posters – all in one simple seller OS.";

export const metadata: Metadata = {
  metadataBase: new URL("https://bazaarbah.my"),
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
    url: "https://bazaarbah.my",
    images: [
      {
        url: "https://bazaarbah.my/og-cover.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["https://bazaarbah.my/og-cover.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
