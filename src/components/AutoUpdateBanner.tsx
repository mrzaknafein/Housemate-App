"use client";

import React, { useEffect, useRef, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";

export function AutoUpdateBanner() {
  const initialCommitRef = useRef<string | null>(null);
  const [updateDetected, setUpdateDetected] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    let mounted = true;

    async function checkVersion() {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const sig = `${data.version}-${data.commit}`;

        if (!initialCommitRef.current) {
          initialCommitRef.current = sig;
        } else if (initialCommitRef.current !== sig && mounted) {
          setUpdateDetected(true);
        }
      } catch {
        // Ignore transient network errors
      }
    }

    checkVersion();
    const interval = setInterval(checkVersion, 20000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!updateDetected) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.location.reload();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [updateDetected]);

  if (!updateDetected) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md rounded-2xl border-2 border-[#cd853f] bg-white p-4 shadow-premium">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#97ffff] text-[#0f172a]">
          <Sparkles className="h-5 w-5 text-[#0f172a]" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-[#97ffff] px-2 py-0.5 text-xs font-bold text-[#0f172a]">
              YENİ SÜRÜM YAYINDA
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-[#1e293b]">
            GitHub üzerinden yeni bir güncelleme dağıtıldı. Ekranınız{" "}
            <span className="font-bold text-[#cd853f]">{countdown} sn</span>{" "}
            içinde otomatik güncelleniyor...
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-[#cd853f] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#b57232]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Şimdi Güncelle
          </button>
        </div>
      </div>
    </div>
  );
}
