import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "SpendSense",
  description: "AI-powered personal finance tracker",
  manifest: "/manifest.json",
  themeColor: "#00E5A0",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SpendSense",
  },
  icons: {
    apple: "/icons/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
