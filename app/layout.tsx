import type { Metadata } from "next";
import { Tsukimi_Rounded } from "next/font/google";
import "./globals.css";

const tsukimiRounded = Tsukimi_Rounded({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-tsukimi-rounded",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Iki Gen - AI Content Generator",
  description: "Generate AI content for your Iki wellness app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${tsukimiRounded.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
