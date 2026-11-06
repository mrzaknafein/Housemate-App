"use client";

import React, { useEffect, useState } from "react";
import { Download, Share, Smartphone, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Check if already running as standalone app
    const isRunningStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isRunningStandalone) {
      setIsStandalone(true);
      return;
    }

    // Check localStorage dismissal
    const isDismissed = localStorage.getItem("hm_pwa_dismissed") === "true";
    if (!isDismissed) {
      setDismissed(false);
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Listen to Chrome / Edge / Android install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  if (isStandalone || dismissed) {
    return null;
  }

  // If not iOS and no install prompt available yet, don't show empty banner
  if (!isIOS && !deferredPrompt) {
    return null;
  }

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
      setDismissed(true);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem("hm_pwa_dismissed", "true");
  }

  return (
    <aside
      aria-label="Uygulama yükleme bildirimi"
      className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md rounded-2xl border-2 border-[#cd853f]/40 bg-white/95 p-3.5 shadow-xl backdrop-blur-md transition-all sm:bottom-6 sm:right-6 sm:left-auto"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#cd853f] text-white shadow-sm">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-[#0f172a]">
              Housemate&apos;i Uygulama Olarak Kullan
            </h4>
            <p className="text-[11px] text-[#475569]">
              {isIOS
                ? "Tarayıcı çubuğundaki Paylaş (⎋) butonuna basıp 'Ana Ekrana Ekle' diyerek telefonunuza yükleyebilirsiniz."
                : "Tarayıcı açmadan doğrudan ana ekranınızdan tek tıkla erişin."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-lg p-1 text-[#475569] hover:bg-[#eecbad]/40 hover:text-[#0f172a]"
          title="Kapat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!isIOS && deferredPrompt && (
        <div className="mt-2.5 flex justify-end">
          <button
            type="button"
            onClick={handleInstallClick}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f172a] px-3.5 py-1.5 text-xs font-extrabold text-[#97ffff] shadow-sm transition hover:bg-[#1e293b]"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Ana Ekrana Yükle</span>
          </button>
        </div>
      )}

      {isIOS && (
        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-[#faf8f5] px-2.5 py-1 text-[10px] font-bold text-[#cd853f] border border-[#eecbad]">
          <Share className="h-3 w-3 shrink-0" />
          <span>Paylaş → Ana Ekrana Ekle</span>
        </div>
      )}
    </aside>
  );
}
