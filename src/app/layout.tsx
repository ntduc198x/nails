import type { Metadata } from "next";
import { Cormorant_Garamond, Geist_Mono, Inter, Montserrat } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "600", "700"],
  style: ["normal", "italic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChamBeauty AI | Tin tức AI & Công nghệ",
  description: "ChamBeauty AI - Nền tảng tin tức AI và công nghệ, cập nhật xu hướng trí tuệ nhân tạo mỗi ngày.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body suppressHydrationWarning className={`${inter.variable} ${montserrat.variable} ${cormorant.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
