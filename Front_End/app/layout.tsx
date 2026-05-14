import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "V-Talk | Vision Talk",
  description:
    "Frontend Next.js untuk V-Talk, sistem penerjemah bahasa isyarat real-time berbasis computer vision.",
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
