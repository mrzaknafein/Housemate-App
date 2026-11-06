"use client";

import React, { useEffect } from "react";
import { RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const msg = error?.message || "";
    if (
      msg.includes("ChunkLoadError") ||
      msg.includes("Loading chunk") ||
      msg.includes("dynamically imported module")
    ) {
      window.location.reload();
    }
  }, [error]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#faf8f5] p-6">
      <div className="max-w-md rounded-3xl border border-[#eecbad] bg-white p-8 text-center shadow-premium">
        <div className="mx-auto mb-3 inline-flex rounded-xl bg-[#97ffff] px-3 py-1 text-xs font-extrabold text-[#0f172a]">
          SAYFA YENİLENİYOR
        </div>
        <h2 className="text-xl font-extrabold text-[#0f172a]">
          Bağlantı Senkronize Ediliyor
        </h2>
        <p className="mt-2 text-xs text-[#475569]">
          Sayfa paketleri güncellendiği için ekranınız yenileniyor.
        </p>
        <button
          type="button"
          onClick={() => {
            reset();
            window.location.reload();
          }}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#cd853f] px-5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-[#b57232]"
        >
          <RefreshCw className="h-4 w-4" />
          Şimdi Yenile
        </button>
      </div>
    </div>
  );
}
