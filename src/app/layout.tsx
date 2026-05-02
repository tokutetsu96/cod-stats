import type { Metadata } from "next";
import { Barlow_Condensed, Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

const notoSansJP = Noto_Sans_JP({
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-jp",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "CoD Stats Dashboard",
  description: "Call of Duty チーム戦績管理ダッシュボード",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`dark ${barlowCondensed.variable} ${notoSansJP.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
