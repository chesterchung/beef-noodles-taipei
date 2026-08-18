import type { Metadata } from "next";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "深夜牛肉麵地圖｜台北・新北・桃園",
  description: "找到台北、新北、桃園凌晨 02:00 後還營業的牛肉麵店。",
  icons: {
    icon: `${basePath}/beef-noodle-favicon.png`,
    shortcut: `${basePath}/beef-noodle-favicon.png`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
