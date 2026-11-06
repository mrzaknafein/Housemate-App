import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AutoUpdateBanner } from "@/components/AutoUpdateBanner";
import { InstallAppBanner } from "@/components/InstallAppBanner";

export const viewport: Viewport = {
  themeColor: "#cd853f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Housemate — Ortak Ev & Yurt Gider Takip Platformu",
  description:
    "Ev ve yurt arkadaşları için özel ay döngülü, dinamik bölüşüm oranlı ve kategori bazlı aylık trend grafikli ortak gider takip uygulaması.",
  applicationName: "Housemate",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Housemate",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e) {
                if (e && e.message && (e.message.indexOf('ChunkLoadError') !== -1 || e.message.indexOf('Loading chunk') !== -1)) {
                  window.location.reload();
                }
              });
            `,
          }}
        />
      </head>
      <body className="min-h-[100dvh] bg-[#faf8f5] font-sans text-[#1e293b] selection:bg-[#eecbad] selection:text-[#0f172a]">
        {children}
        <AutoUpdateBanner />
        <InstallAppBanner />
      </body>
    </html>
  );
}
