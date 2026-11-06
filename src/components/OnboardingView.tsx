"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Home,
  KeyRound,
  Sparkles,
  Users,
  ArrowRight,
  CalendarClock,
  TrendingUp,
  PieChart,
  CheckCircle2,
} from "lucide-react";

export function OnboardingView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCodeParam = searchParams.get("join") || "";

  const [activeTab, setActiveTab] = useState<"create" | "join">(
    inviteCodeParam ? "join" : "create"
  );
  const [userName, setUserName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomType, setRoomType] = useState<"HOUSE" | "DORM">("HOUSE");
  const [cycleDay, setCycleDay] = useState<number>(15);
  const [withSampleData, setWithSampleData] = useState<boolean>(false);
  const [roomCodeInput, setRoomCodeInput] = useState(
    inviteCodeParam.toUpperCase()
  );

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verifyExistingSession() {
      try {
        // If user clicked a join link, let them see the join screen prefilled
        if (inviteCodeParam) {
          const savedName = localStorage.getItem("hm_user_name");
          if (savedName) setUserName(savedName);
          setActiveTab("join");
          setRoomCodeInput(inviteCodeParam.toUpperCase());
          setCheckingSession(false);
          return;
        }

        const res = await fetch("/api/auth", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.room?.code) {
            localStorage.setItem("hm_user_token", data.member.token);
            localStorage.setItem("hm_user_name", data.member.name);
            localStorage.setItem("hm_room_code", data.room.code);
            router.replace(`/room/${data.room.code}`);
            return;
          }
        }

        // Fallback to localStorage if cookie was cleared
        const localRoomCode = localStorage.getItem("hm_room_code");
        const localUserName = localStorage.getItem("hm_user_name");
        if (localUserName) setUserName(localUserName);

        if (localRoomCode && localUserName) {
          const rejoinRes = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "join",
              userName: localUserName,
              roomCode: localRoomCode,
            }),
          });
          if (rejoinRes.ok) {
            const rejoinData = await rejoinRes.json();
            if (rejoinData.roomCode) {
              router.replace(`/room/${rejoinData.roomCode}`);
              return;
            }
          }
        }
      } catch {
        // Ignore session check errors
      } finally {
        setCheckingSession(false);
      }
    }

    verifyExistingSession();
  }, [inviteCodeParam, router]);

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          userName,
          roomName,
          roomType,
          cycleDay,
          withSampleData,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Oda oluşturulamadı.");
        setLoading(false);
        return;
      }

      localStorage.setItem("hm_user_token", data.userToken);
      localStorage.setItem("hm_user_name", data.member.name);
      localStorage.setItem("hm_room_code", data.roomCode);
      router.push(`/room/${data.roomCode}`);
    } catch {
      setError("Sunucu ile bağlantı kurulamadı.");
      setLoading(false);
    }
  }

  async function handleJoinRoom(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
          userName,
          roomCode: roomCodeInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Odaya katılınamadı.");
        setLoading(false);
        return;
      }

      localStorage.setItem("hm_user_token", data.userToken);
      localStorage.setItem("hm_user_name", data.member.name);
      localStorage.setItem("hm_room_code", data.roomCode);
      router.push(`/room/${data.roomCode}`);
    } catch {
      setError("Sunucu ile bağlantı kurulamadı.");
      setLoading(false);
    }
  }

  async function handleQuickDemo(demoCode: "HM-DEMO" | "HM-YURT", defaultDemoUser: string) {
    setError(null);
    setLoading(true);
    try {
      const nameToUse = userName.trim().length >= 2 ? userName.trim() : defaultDemoUser;
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
          userName: nameToUse,
          roomCode: demoCode,
        }),
      });
      const data = await res.json();
      if (res.ok && data.roomCode) {
        localStorage.setItem("hm_user_token", data.userToken);
        localStorage.setItem("hm_user_name", data.member.name);
        localStorage.setItem("hm_room_code", data.roomCode);
        router.push(`/room/${data.roomCode}`);
        return;
      }
      setError(data.error || "Demo odasına bağlanılamadı.");
      setLoading(false);
    } catch {
      setError("Demo odasına bağlanırken hata oluştu.");
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#faf8f5] p-6">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-[#eecbad] bg-white p-8 shadow-premium">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#eecbad] border-t-[#cd853f]" />
          <p className="text-sm font-semibold text-[#1e293b]">
            Oturumunuz kontrol ediliyor...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#faf8f5] px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-6xl">
        {/* Top Brand Bar */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[#eecbad] pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#cd853f] text-white shadow-sm">
              <Home className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-2xl font-extrabold tracking-tight text-[#0f172a]">
                  Housemate
                </span>
                <span className="rounded-full bg-[#97ffff] px-2.5 py-0.5 text-xs font-bold text-[#0f172a]">
                  Canlı Senkronizasyon
                </span>
              </div>
              <p className="text-xs font-medium text-[#475569]">
                Ev & Yurt Arkadaşları İçin Akıllı Fatura ve Ortak Gider Takibi
              </p>
            </div>
          </div>

          {/* Instant Demo Room Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo("HM-DEMO", "Çağatay")}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-[#eecbad] bg-white px-3.5 py-2 text-xs font-bold text-[#1e293b] shadow-sm transition hover:border-[#cd853f] hover:bg-[#eecbad]/30"
            >
              <span className="rounded-md bg-[#97ffff] px-1.5 py-0.5 font-mono text-[11px] font-extrabold text-[#0f172a]">
                HM-DEMO
              </span>
              <span>Örnek Ev Panelini Aç (4 Aylık Veri)</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo("HM-YURT", "Mert")}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-[#eecbad] bg-white px-3.5 py-2 text-xs font-bold text-[#1e293b] shadow-sm transition hover:border-[#cd853f] hover:bg-[#eecbad]/30"
            >
              <span className="rounded-md bg-[#97ffff] px-1.5 py-0.5 font-mono text-[11px] font-extrabold text-[#0f172a]">
                HM-YURT
              </span>
              <span>Örnek Yurt Panelini Aç</span>
            </button>
          </div>
        </header>

        {/* Main Asymmetric Layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
          {/* Left Column: Interactive Onboarding Card (7 cols) */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-[#eecbad] bg-white p-6 shadow-premium md:p-8">
              {/* Mode Switch Tabs */}
              <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-[#faf8f5] p-1.5 border border-[#eecbad]">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("create");
                    setError(null);
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition ${
                    activeTab === "create"
                      ? "bg-[#cd853f] text-white shadow-sm"
                      : "text-[#475569] hover:text-[#0f172a]"
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  Yeni Ortam Oluştur
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("join");
                    setError(null);
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition ${
                    activeTab === "join"
                      ? "bg-[#cd853f] text-white shadow-sm"
                      : "text-[#475569] hover:text-[#0f172a]"
                  }`}
                >
                  <KeyRound className="h-4 w-4" />
                  Mevcut Ortama Katıl
                </button>
              </div>

              {error && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm font-semibold text-red-900">
                  {error}
                </div>
              )}

              <AnimatePresence mode="wait">
                {activeTab === "create" ? (
                  <motion.form
                    key="create-form"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleCreateRoom}
                    className="space-y-5"
                  >
                    <div>
                      <h1 className="text-2xl font-extrabold text-[#0f172a]">
                        Şifresiz, Anında Ortak Gider Odası Açın
                      </h1>
                      <p className="mt-1 text-sm text-[#475569]">
                        E-posta veya şifre gerekmez. Sadece adınızı ve konaklama
                        tipinizi seçin; 6 haneli oda kodunuz anında üretilsin.
                      </p>
                    </div>

                    {/* User Name */}
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#1e293b]">
                        İsminiz *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Örn: Çağatay"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="w-full rounded-xl border border-[#eecbad] bg-[#faf8f5] px-4 py-3 text-sm font-semibold text-[#0f172a] placeholder-[#475569]/60 outline-none transition focus:border-[#cd853f] focus:bg-white focus:ring-2 focus:ring-[#cd853f]/20"
                      />
                    </div>

                    {/* Accommodation Type Selector: House vs Dorm */}
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#1e293b]">
                        Konaklama Tipi Seçin *
                      </label>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => setRoomType("HOUSE")}
                          className={`flex items-start gap-3.5 rounded-2xl border-2 p-4 text-left transition ${
                            roomType === "HOUSE"
                              ? "border-[#cd853f] bg-[#eecbad]/35"
                              : "border-[#eecbad] bg-[#faf8f5] hover:bg-[#eecbad]/15"
                          }`}
                        >
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                              roomType === "HOUSE"
                                ? "bg-[#cd853f] text-white"
                                : "bg-[#eecbad] text-[#0f172a]"
                            }`}
                          >
                            <Home className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-[#0f172a]">
                                Ev (House)
                              </span>
                              {roomType === "HOUSE" && (
                                <CheckCircle2 className="h-4 w-4 text-[#cd853f]" />
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-[#475569]">
                              Kira, Elektrik, Su, Doğalgaz, İnternet ve Damacana
                              Su gibi sabit & özel ev giderleri.
                            </p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRoomType("DORM")}
                          className={`flex items-start gap-3.5 rounded-2xl border-2 p-4 text-left transition ${
                            roomType === "DORM"
                              ? "border-[#cd853f] bg-[#eecbad]/35"
                              : "border-[#eecbad] bg-[#faf8f5] hover:bg-[#eecbad]/15"
                          }`}
                        >
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                              roomType === "DORM"
                                ? "bg-[#cd853f] text-white"
                                : "bg-[#eecbad] text-[#0f172a]"
                            }`}
                          >
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-[#0f172a]">
                                Yurt (Dorm)
                              </span>
                              {roomType === "DORM" && (
                                <CheckCircle2 className="h-4 w-4 text-[#cd853f]" />
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-[#475569]">
                              Ortak Market/Atıştırmalık, Damacana Su,
                              Çamaşırhane/Kurutma ve Ortak Abonelikler.
                            </p>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Optional Room Name & Custom Billing Cycle Day */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#1e293b]">
                          Ortam / Oda Adı (İsteğe Bağlı)
                        </label>
                        <input
                          type="text"
                          placeholder={
                            roomType === "HOUSE"
                              ? "Örn: Kadıköy Evimiz"
                              : "Örn: 304 Nolu Yurt Odası"
                          }
                          value={roomName}
                          onChange={(e) => setRoomName(e.target.value)}
                          className="w-full rounded-xl border border-[#eecbad] bg-[#faf8f5] px-3.5 py-2.5 text-sm font-medium text-[#0f172a] placeholder-[#475569]/60 outline-none focus:border-[#cd853f] focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#1e293b]">
                          Ay Döngüsü Sıfırlama Günü (1-28)
                        </label>
                        <select
                          value={cycleDay}
                          onChange={(e) => setCycleDay(Number(e.target.value))}
                          className="w-full rounded-xl border border-[#eecbad] bg-[#faf8f5] px-3.5 py-2.5 text-sm font-bold text-[#0f172a] outline-none focus:border-[#cd853f] focus:bg-white"
                        >
                          {Array.from({ length: 28 }, (_, i) => i + 1).map(
                            (d) => (
                              <option key={d} value={d}>
                                Her Ayın {d}. Günü{" "}
                                {d === 1
                                  ? "(Standart Ay Başı)"
                                  : d === 15
                                  ? "(Maaş/Burs Döngüsü - 15'i)"
                                  : ""}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Option to pre-load 4-month sample history or start clean (and manually add past months) */}
                    <div className="rounded-2xl border border-[#eecbad] bg-[#eecbad]/25 p-4">
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={withSampleData}
                          onChange={(e) => setWithSampleData(e.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-[#cd853f] text-[#cd853f] focus:ring-[#cd853f]"
                        />
                        <div>
                          <span className="block text-sm font-bold text-[#0f172a]">
                            4 Aylık Örnek Geçmiş Veriyle Başlat (Grafikleri Dolu Gör)
                          </span>
                          <span className="mt-0.5 block text-xs text-[#475569]">
                            İşaretlemezseniz tertemiz bir odayla başlarsınız ve{" "}
                            <strong className="text-[#0f172a]">
                              &ldquo;+ Geçmiş Ay/Dönem Ekle&rdquo;
                            </strong>{" "}
                            butonuyla geçmiş aylarınızı kendi elinizle
                            girebilirsiniz.
                          </span>
                        </div>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#cd853f] px-6 py-4 text-base font-extrabold text-white shadow-md transition hover:bg-[#b57232] active:scale-[0.99] disabled:opacity-60"
                    >
                      <span>
                        {loading
                          ? "Odanız Hazırlanıyor..."
                          : "Odayı Oluştur ve Kodu Üret"}
                      </span>
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </motion.form>
                ) : (
                  <motion.form
                    key="join-form"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleJoinRoom}
                    className="space-y-5"
                  >
                    <div>
                      <h1 className="text-2xl font-extrabold text-[#0f172a]">
                        Arkadaşınızın Odasına Katılın
                      </h1>
                      <p className="mt-1 text-sm text-[#475569]">
                        Ev veya yurt arkadaşınızdan aldığınız 6 haneli Oda
                        Kodunu girin; aktif dönem bölüşüm oranları otomatik
                        güncellensin.
                      </p>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#1e293b]">
                        İsminiz *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Örn: Zeynep"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="w-full rounded-xl border border-[#eecbad] bg-[#faf8f5] px-4 py-3 text-sm font-semibold text-[#0f172a] placeholder-[#475569]/60 outline-none transition focus:border-[#cd853f] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#1e293b]">
                        6 Haneli Oda Kodu *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Örn: HM-4829 veya HM-DEMO"
                        value={roomCodeInput}
                        onChange={(e) =>
                          setRoomCodeInput(e.target.value.toUpperCase())
                        }
                        className="w-full rounded-xl border-2 border-[#eecbad] bg-[#faf8f5] px-4 py-3.5 font-mono text-lg font-extrabold tracking-wider text-[#0f172a] placeholder-[#475569]/50 outline-none transition focus:border-[#cd853f] focus:bg-white"
                      />
                      <p className="mt-1.5 text-xs font-medium text-[#475569]">
                        Test etmek için{" "}
                        <button
                          type="button"
                          onClick={() => setRoomCodeInput("HM-DEMO")}
                          className="rounded bg-[#97ffff] px-1.5 py-0.5 font-mono font-bold text-[#0f172a] underline"
                        >
                          HM-DEMO
                        </button>{" "}
                        veya{" "}
                        <button
                          type="button"
                          onClick={() => setRoomCodeInput("HM-YURT")}
                          className="rounded bg-[#97ffff] px-1.5 py-0.5 font-mono font-bold text-[#0f172a] underline"
                        >
                          HM-YURT
                        </button>{" "}
                        kodunu da kullanabilirsiniz.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#cd853f] px-6 py-4 text-base font-extrabold text-white shadow-md transition hover:bg-[#b57232] active:scale-[0.99] disabled:opacity-60"
                    >
                      <span>
                        {loading ? "Odaya Bağlanılıyor..." : "Aynı Panele Bağlan"}
                      </span>
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Column: Light Premium Architectural Showcase (5 cols) */}
          <div className="space-y-4 lg:col-span-5">
            {/* Special Highlight Card using #97ffff with strict #0f172a contrast */}
            <div className="rounded-3xl border-2 border-[#cd853f]/30 bg-[#97ffff] p-6 text-[#0f172a] shadow-sm">
              <div className="inline-flex items-center gap-2 rounded-lg bg-[#0f172a] px-2.5 py-1 text-xs font-bold text-[#97ffff]">
                <CalendarClock className="h-3.5 w-3.5" />
                ÖZEL AY DÖNGÜSÜ & GEÇMİŞ AY GİRİŞİ
              </div>
              <h2 className="mt-3 text-xl font-extrabold text-[#0f172a]">
                Ayın 1&apos;ine Mahkum Değilsiniz
              </h2>
              <p className="mt-1.5 text-sm font-medium leading-relaxed text-[#0f172a]">
                Burs veya maaş gününüze göre döngü gününü (Örn: Ayın 15&apos;i)
                seçin; <strong>15 Ekim - 14 Kasım</strong> arası tek dönem
                sayılsın. Üstelik yeni oturum açtığınızda bile{" "}
                <strong>geçmiş ayları kendi elinizle ekleyip</strong> anında
                trend grafiği oluşturabilirsiniz.
              </p>
            </div>

            {/* Feature Cards in #ffffff & #eecbad */}
            <div className="rounded-3xl border border-[#eecbad] bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eecbad] text-[#0f172a]">
                  <PieChart className="h-5 w-5 text-[#0f172a]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0f172a]">
                    Dinamik & Kategori Bazlı Bölüşüm Oranı
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#475569]">
                    Karmaşık borç mahsuplaşma tabloları yok! Odada kaç kişi varsa
                    otomatik eşit bölünür (%50-%50, %33.3-%33.3-%33.3) veya
                    Kira için %60-%40 gibi özel oran tanımlanır. Yeni kişi
                    katıldığında geçmiş dönemlerin oranları bozulmaz.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[#eecbad] bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eecbad] text-[#0f172a]">
                  <TrendingUp className="h-5 w-5 text-[#0f172a]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0f172a]">
                    Her Gider Kalemi İçin Ayrı Aylık Grafik
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#475569]">
                    Kira, Elektrik, Su, Doğalgaz, İnternet ve{" "}
                    <strong className="text-[#0f172a]">Damacana Su</strong> gibi
                    tekrarlayan kalemler tek başlık altında toplanır; her
                    kalemin kendine ait aylık değişim grafiği ve{" "}
                    <strong className="text-[#cd853f]">% Artış / % Azalış</strong>{" "}
                    rozeti sunulur.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[#eecbad] bg-[#eecbad]/35 p-5">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-[#cd853f]" />
                <p className="text-xs font-bold text-[#0f172a]">
                  Tarayıcıyı kapatıp açsanız bile şifresiz olarak doğrudan kendi
                  evinize veya yurt odanıza bağlanırsınız.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
