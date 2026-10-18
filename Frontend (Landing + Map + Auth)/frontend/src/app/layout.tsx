import type { Metadata } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import NavbarWrapper from "@/components/NavbarWrapper";

const geist = Geist({
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Egypt's Career Map",
  description: "Navigate Egypt's Job Market with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className={`${geist.className} antialiased bg-background text-on-surface min-h-screen`}>
        <NavbarWrapper />
        {children}
      </body>
    </html>
  );
}
