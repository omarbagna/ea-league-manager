import type { Metadata, Viewport } from "next";
import { Anybody, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";

const anybody = Anybody({
  variable: "--font-anybody",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Dark Elite League",
  description: "Competitive league management for Dark Elite League",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Dark Elite", statusBarStyle: "black-translucent" },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0d11",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${anybody.variable} ${hanken.variable} ${jetbrains.variable} min-h-screen`}
      >
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
