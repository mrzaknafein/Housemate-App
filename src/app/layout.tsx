import type { Metadata } from "next";
import "./globals.css";
import { AutoUpdateBanner } from "@/components/AutoUpdateBanner";

export const metadata: Metadata = {
  title: "Housemate — Ortak Ev & Yurt Gider Takip Platformu",
  description:
    "Ev ve yurt arkadaşları için özel ay döngülü, dinamik bölüşüm oranlı ve kategori bazlı aylık trend grafikli ortak gider takip uygulaması.",
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
      </body>
    </html>
  );
}
