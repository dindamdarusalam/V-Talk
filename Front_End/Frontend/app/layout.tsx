import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const appName = "V-Talk";
const appTagline = "Edukasi bahasa isyarat: menjembatani komunikasi serta mewujudkan kesetaraan.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: appName,
  title: {
    default: `${appName} | Vision Talk`,
    template: `%s | ${appName}`,
  },
  description: appTagline,
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: appName,
    title: `${appName} | Vision Talk`,
    description: appTagline,
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: `${appName} logo`,
      },
    ],
    locale: "id_ID",
  },
  twitter: {
    card: "summary",
    title: `${appName} | Vision Talk`,
    description: appTagline,
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
