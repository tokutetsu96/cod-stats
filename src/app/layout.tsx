import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CoD Stats Dashboard",
  description: "Call of Duty チーム戦績管理ダッシュボード",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
