import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Inter } from "next/font/google";
import { FloatingNavbar } from "@/components/layout/FloatingNavbar";
import { Footer } from "@/components/layout/Footer";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-be-vietnam-pro",
  display: "swap",
});

const inter = Inter({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://hangout-vn.vercel.app"),
  title: {
    default: "HANGOUT VN — Discover. Eat. Chill. Repeat.",
    template: "%s | HANGOUT VN",
  },
  description:
    "Khám phá hơn 1.360 địa điểm ăn uống, cà phê, hẹn hò, workshop và tọa độ chill trên khắp 34 tỉnh/thành Việt Nam dành cho giới trẻ.",
  keywords: [
    "HANGOUT VN",
    "đi đâu hôm nay",
    "ăn uống Việt Nam",
    "quán cà phê đẹp",
    "địa điểm hẹn hò",
    "ăn vặt Sài Gòn",
    "ăn uống Hà Nội",
    "34 tỉnh thành Việt Nam",
  ],
  icons: {
    icon: [
      { url: "/logo-mark.svg", type: "image/svg+xml" },
    ],
    shortcut: ["/logo-mark.svg"],
    apple: ["/logo-mark.svg"],
  },
  openGraph: {
    title: "HANGOUT VN — Đi đâu hôm nay?",
    description:
      "Khám phá những góc thú vị, món ngon và cuộc vui đang chờ bạn trên khắp 34 tỉnh/thành Việt Nam.",
    type: "website",
    locale: "vi_VN",
    siteName: "HANGOUT VN",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFF8ED",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-[#FFF8ED] text-[#242424] antialiased selection:bg-[#FFD166] selection:text-[#242424]">
        <div className="editorial-grain" aria-hidden="true" />
        <SmoothScroll>
          <FloatingNavbar />
          <main id="main-content" className="min-h-[80vh]">
            {children}
          </main>
          <Footer />
        </SmoothScroll>
      </body>
    </html>
  );
}
