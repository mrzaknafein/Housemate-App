"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import {
  BarChart3,
  Eye,
  EyeOff,
  LayoutGrid,
  Plus,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import {
  HistoricalPeriodTemplate,
  RoomData,
} from "@/types/housemate";
import { RoomHeader } from "@/components/RoomHeader";
import { BillingPeriodSelector } from "@/components/BillingPeriodSelector";
import { ExpenseCategoryCard } from "@/components/ExpenseCategoryCard";
import { AddExpenseModal } from "@/components/AddExpenseModal";
import { SplitRatioModal } from "@/components/SplitRatioModal";
import { RoommatesModal } from "@/components/RoommatesModal";
import { CategoryAnalyticsGrid } from "@/components/CategoryAnalyticsGrid";
import { formatCurrencyTRY } from "@/components/CategoryIcon";

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Veri alınamadı");
  }
  return res.json();
};

export default function RoomDashboardPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const roomCode = (params?.code || "").toUpperCase();

  // Real-Time Synchronization via SWR (3s smart polling + focus revalidation)
  const { data, error, isValidating, mutate } = useSWR<{
    room: RoomData;
    availableHistoricalTemplates: HistoricalPeriodTemplate[];
  }>(roomCode ? `/api/rooms/${roomCode}` : null, fetcher, {
    refreshInterval: 3000,
    revalidateOnFocus: true,
  });

  const room = data?.room;
  const availableHistoricalTemplates = useMemo(
    () => data?.availableHistoricalTemplates ?? [],
    [data?.availableHistoricalTemplates]
  );

  const [currentMemberName, setCurrentMemberName] = useState<string>("Ev Arkadaşı");
  const [currentMemberId, setCurrentMemberId] = useState<string>("");
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [activeViewTab, setActiveViewTab] = useState<"cards" | "analytics">("cards");

  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [defaultExpenseCategoryId, setDefaultExpenseCategoryId] = useState<
    string | undefined
  >(undefined);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [splitTargetCategoryId, setSplitTargetCategoryId] = useState<
    string | undefined
  >(undefined);
  const [isCycleModalOpen, setIsCycleModalOpen] = useState(false);
  const [isRoommatesModalOpen, setIsRoommatesModalOpen] = useState(false);
  const [summaryCopied, setSummaryCopied] = useState(false);
  const [showPaidOutRow, setShowPaidOutRow] = useState<boolean>(true);

  useEffect(() => {
    const savedPref = localStorage.getItem("hm_show_paid_row");
    if (savedPref !== null) {
      setShowPaidOutRow(savedPref === "true");
    }
  }, []);

  function toggleShowPaidOutRow() {
    setShowPaidOutRow((prev) => {
      const next = !prev;
      localStorage.setItem("hm_show_paid_row", String(next));
      return next;
    });
  }

  // Sync user identity with room members
  useEffect(() => {
    if (!room) return;
    const savedName = localStorage.getItem("hm_user_name");
    const savedToken = localStorage.getItem("hm_user_token");
    localStorage.setItem("hm_room_code", room.code);

    const matchedByToken = room.members.find((m) => m.token === savedToken);
    const matchedByName = savedName
      ? room.members.find(
          (m) => m.name.toLowerCase() === savedName.toLowerCase()
        )
      : undefined;
    const activeMember = matchedByToken || matchedByName || room.members[0];

    if (activeMember) {
      setCurrentMemberName(activeMember.name);
      setCurrentMemberId(activeMember.id);
    }
  }, [room]);

  // Initialize selectedPeriodId to the room's active period
  useEffect(() => {
    if (!room || room.periods.length === 0) return;
    const stillValid = room.periods.some((p) => p.id === selectedPeriodId);
    if (!selectedPeriodId || !stillValid) {
      const active =
        room.periods.find((p) => p.isActive) ||
        room.periods[room.periods.length - 1];
      if (active) setSelectedPeriodId(active.id);
    }
  }, [room, selectedPeriodId]);

  const selectedPeriod = useMemo(() => {
    if (!room) return undefined;
    return (
      room.periods.find((p) => p.id === selectedPeriodId) ||
      room.periods.find((p) => p.isActive) ||
      room.periods[0]
    );
  }, [room, selectedPeriodId]);

  // Previous chronological period for % change calculation on category cards
  const previousPeriod = useMemo(() => {
    if (!room || !selectedPeriod) return undefined;
    const sorted = [...room.periods].sort((a, b) =>
      a.periodKey.localeCompare(b.periodKey)
    );
    const idx = sorted.findIndex((p) => p.id === selectedPeriod.id);
    return idx > 0 ? sorted[idx - 1] : undefined;
  }, [room, selectedPeriod]);

  // Calculate current period summary & each member's total share based on category split ratios
  const periodSummary = useMemo(() => {
    if (!room || !selectedPeriod) {
      return { totalPeriodAmount: 0, memberShares: [] };
    }

    const periodExpenses = room.expenses.filter(
      (e) => e.periodId === selectedPeriod.id
    );
    const totalPeriodAmount = periodExpenses.reduce(
      (sum, e) => sum + e.amount,
      0
    );

    const shareMap: Record<string, number> = {};
    const paidMap: Record<string, number> = {};
    room.members.forEach((m) => {
      shareMap[m.id] = 0;
      paidMap[m.id] = 0;
    });

    periodExpenses.forEach((exp) => {
      paidMap[exp.paidById] = (paidMap[exp.paidById] || 0) + exp.amount;
    });

    room.categories.forEach((cat) => {
      const catTotal = periodExpenses
        .filter((e) => e.categoryId === cat.id)
        .reduce((s, e) => s + e.amount, 0);

      room.members.forEach((m) => {
        const periodSplit = selectedPeriod.periodSplits?.find(
          (ps) => ps.categoryId === cat.id && ps.memberId === m.id
        );
        const catSplit = cat.splits?.find((s) => s.memberId === m.id);
        const pct =
          periodSplit !== undefined
            ? periodSplit.percentage
            : catSplit !== undefined
            ? catSplit.percentage
            : room.members.length > 0
            ? 100 / room.members.length
            : 100;

        shareMap[m.id] += (catTotal * pct) / 100;
      });
    });

    const memberShares = room.members.map((m) => ({
      member: m,
      shareAmount: shareMap[m.id] || 0,
      paidAmount: paidMap[m.id] || 0,
    }));

    return { totalPeriodAmount, memberShares };
  }, [room, selectedPeriod]);

  // Action Handlers
  async function handleAddExpense(payload: {
    categoryId?: string;
    customCategoryName?: string;
    amount: number;
    paidById: string;
    title: string;
    periodId?: string;
    periodKey?: string;
  }) {
    const res = await fetch(`/api/rooms/${roomCode}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || "Gider kaydedilemedi.");
    }
    if (result.expense?.periodId) {
      setSelectedPeriodId(result.expense.periodId);
    }
    await mutate();
  }

  async function handleEditExpense(
    expenseId: string,
    payload: { amount: number; title: string; paidById: string }
  ) {
    await fetch(`/api/rooms/${roomCode}/expenses`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: expenseId, ...payload }),
    });
    await mutate();
  }

  async function handleDeleteExpense(expenseId: string) {
    await fetch(`/api/rooms/${roomCode}/expenses?id=${expenseId}`, {
      method: "DELETE",
    });
    await mutate();
  }

  async function handleAddRoommate(name: string) {
    const res = await fetch(`/api/rooms/${roomCode}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || "Kişi eklenemedi.");
    }
    await mutate();
  }

  async function handleRemoveRoommate(memberId: string) {
    const res = await fetch(`/api/rooms/${roomCode}/members?id=${memberId}`, {
      method: "DELETE",
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || "Kişi silinemedi.");
    }
    await mutate();
  }

  function handleCopyPeriodSummary() {
    if (!room || !selectedPeriod) return;
    const periodExps = room.expenses.filter(
      (e) => e.periodId === selectedPeriod.id
    );

    const catLines = room.categories
      .map((cat) => {
        const sum = periodExps
          .filter((e) => e.categoryId === cat.id)
          .reduce((a, b) => a + b.amount, 0);
        if (sum <= 0) return null;
        return `• ${cat.name}: ${formatCurrencyTRY(sum)}`;
      })
      .filter(Boolean)
      .join("\n");

    const memberLines = periodSummary.memberShares
      .map(
        ({ member, shareAmount, paidAmount }) =>
          `👤 ${member.name}: Dönem Payı ${formatCurrencyTRY(
            shareAmount
          )} (Ödediği: ${formatCurrencyTRY(paidAmount)})`
      )
      .join("\n");

    const text = [
      `🏠 *${room.name}* (${room.code})`,
      `📅 *Dönem:* ${selectedPeriod.label}`,
      `💰 *Toplam Gider:* ${formatCurrencyTRY(periodSummary.totalPeriodAmount)}`,
      catLines ? `\n*Gider Kalemleri:*\n${catLines}` : "",
      `\n*Kişi Başı Düşen Paylar:*\n${memberLines}`,
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(text);
    setSummaryCopied(true);
    setTimeout(() => setSummaryCopied(false), 2500);
  }

  async function handleSaveSplits(payload: {
    categoryId?: string;
    applyToAll: boolean;
    resetToEqual: boolean;
    periodId: string;
    splits: Array<{ memberId: string; percentage: number }>;
  }) {
    const res = await fetch(`/api/rooms/${roomCode}/categories`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || "Oranlar güncellenemedi.");
    }
    await mutate();
  }

  async function handleToggleZeroConfirmed(
    categoryId: string,
    isZeroConfirmed: boolean
  ) {
    if (!selectedPeriod) return;
    await fetch(`/api/rooms/${roomCode}/categories`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        periodId: selectedPeriod.id,
        categoryId,
        isZeroConfirmed,
      }),
    });
    await mutate();
  }

  async function handleCreateHistoricalPeriod(
    periodKey: string
  ): Promise<string | null> {
    const res = await fetch(`/api/rooms/${roomCode}/periods`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodKey }),
    });
    const result = await res.json();
    await mutate();
    return result.period?.id || null;
  }

  async function handleUpdateCycleDay(newCycleDay: number) {
    await fetch(`/api/rooms/${roomCode}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cycleDay: newCycleDay }),
    });
    await mutate();
  }

  async function handlePopulateDemoData() {
    await fetch(`/api/rooms/${roomCode}/seed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "populate" }),
    });
    await mutate();
  }

  async function handleLogout() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    localStorage.removeItem("hm_room_code");
    localStorage.removeItem("hm_user_token");
    router.push("/");
  }

  if (error) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#faf8f5] p-6">
        <div className="max-w-md rounded-3xl border border-[#eecbad] bg-white p-8 text-center shadow-premium">
          <h2 className="text-xl font-extrabold text-[#0f172a]">
            Oda Bulunamadı ({roomCode})
          </h2>
          <p className="mt-2 text-sm text-[#475569]">
            Girdiğiniz oda kodu mevcut değil veya silinmiş olabilir.
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-5 rounded-xl bg-[#cd853f] px-5 py-2.5 text-sm font-extrabold text-white shadow-sm hover:bg-[#b57232]"
          >
            Karşılama Ekranına Dön
          </button>
        </div>
      </main>
    );
  }

  if (!room || !selectedPeriod) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#faf8f5] p-6">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-[#eecbad] bg-white p-8 shadow-premium">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#eecbad] border-t-[#cd853f]" />
          <p className="text-sm font-bold text-[#0f172a]">
            {roomCode} Odası Yükleniyor...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#faf8f5] px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* 1. Top Room Header */}
        <RoomHeader
          room={room}
          currentMemberName={currentMemberName}
          onOpenSplitModal={() => {
            setSplitTargetCategoryId(undefined);
            setIsSplitModalOpen(true);
          }}
          onOpenCycleModal={() => setIsCycleModalOpen(true)}
          onOpenRoommatesModal={() => setIsRoommatesModalOpen(true)}
          onCopyPeriodSummary={handleCopyPeriodSummary}
          summaryCopied={summaryCopied}
          onPopulateDemoData={handlePopulateDemoData}
          onLogout={handleLogout}
          isSyncing={isValidating}
        />

        {/* 2. Billing Period Selector & Manual Historical Month Entry */}
        <BillingPeriodSelector
          periods={room.periods}
          selectedPeriodId={selectedPeriod.id}
          onSelectPeriod={(id) => setSelectedPeriodId(id)}
          availableHistoricalTemplates={availableHistoricalTemplates}
          cycleDay={room.cycleDay}
          onCreateHistoricalPeriod={handleCreateHistoricalPeriod}
          onUpdateCycleDay={handleUpdateCycleDay}
          isCycleModalOpen={isCycleModalOpen}
          setIsCycleModalOpen={setIsCycleModalOpen}
        />

        {/* 3. Period Overview Banner: Total & Per-Roommate Dynamic Share Cards */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Period Total Card */}
          <div className="flex flex-col justify-between rounded-3xl border-2 border-[#cd853f]/35 bg-[#97ffff] p-6 text-[#0f172a] shadow-sm lg:col-span-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f172a] px-2.5 py-1 text-[11px] font-extrabold text-[#97ffff]">
                  <Wallet className="h-3.5 w-3.5" />
                  DÖNEM TOPLAM GİDERİ
                </span>
                <span className="font-mono text-xs font-extrabold text-[#0f172a]">
                  {room.categories.length} Kalem
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold tabular-nums tracking-tight text-[#0f172a] md:text-4xl">
                {formatCurrencyTRY(periodSummary.totalPeriodAmount)}
              </p>
              <p className="mt-1 text-xs font-bold text-[#0f172a]/80">
                {selectedPeriod.label} dönemi toplamı
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setDefaultExpenseCategoryId(undefined);
                  setIsAddExpenseOpen(true);
                }}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0f172a] px-4 py-3 text-xs font-extrabold text-[#97ffff] shadow-sm transition hover:bg-[#1e293b]"
              >
                <Plus className="h-4 w-4" />
                <span>+ Yeni Gider / Hizmet Ekle</span>
              </button>
            </div>
          </div>

          {/* Per-Member Share Cards (No Debt Maze — Pure Split Ratio Shares) */}
          <div className="rounded-3xl border border-[#eecbad] bg-white p-5 shadow-sm lg:col-span-8">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#cd853f]" />
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0f172a]">
                  Bu Dönem Kişi Başı Düşen Toplam Paylar (Kategori Oranlarına Göre)
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={toggleShowPaidOutRow}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-bold transition ${
                    showPaidOutRow
                      ? "border-[#cd853f]/40 bg-[#eecbad]/35 text-[#0f172a]"
                      : "border-[#eecbad] bg-[#faf8f5] text-[#475569]"
                  }`}
                  title="Kasadan ödediği tutar bilgisini göster veya gizle"
                >
                  {showPaidOutRow ? (
                    <>
                      <Eye className="h-3.5 w-3.5 text-[#cd853f]" />
                      <span>Kasadan Ödeneni Gizle</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-3.5 w-3.5 text-[#475569]" />
                      <span>Kasadan Ödeneni Göster</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsRoommatesModalOpen(true)}
                  className="text-xs font-extrabold text-[#0f172a] underline decoration-[#eecbad] underline-offset-2 hover:text-[#cd853f]"
                >
                  + Ev/Yurt Arkadaşı Ekle
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSplitTargetCategoryId(undefined);
                    setIsSplitModalOpen(true);
                  }}
                  className="text-xs font-extrabold text-[#cd853f] underline underline-offset-2 hover:text-[#b57232]"
                >
                  Oranları Özelleştir (%)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {periodSummary.memberShares.map(
                ({ member, shareAmount, paidAmount }) => {
                  const effectiveRatio =
                    periodSummary.totalPeriodAmount > 0
                      ? (shareAmount / periodSummary.totalPeriodAmount) * 100
                      : 100 / Math.max(1, room.members.length);

                  return (
                    <div
                      key={member.id}
                      className="flex flex-col justify-between rounded-2xl border border-[#eecbad] bg-[#faf8f5] p-4 transition hover:border-[#cd853f]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{
                              backgroundColor: member.avatarColor || "#cd853f",
                            }}
                          />
                          <span className="text-sm font-extrabold text-[#0f172a]">
                            {member.name}
                          </span>
                        </div>
                        <span className="rounded-lg bg-[#eecbad] px-2 py-0.5 font-mono text-[11px] font-extrabold text-[#0f172a]">
                          Ort. %{effectiveRatio.toFixed(1).replace(".0", "")}
                        </span>
                      </div>

                      <div className="mt-3">
                        <span className="block text-[11px] font-semibold text-[#475569]">
                          Dönem Payı:
                        </span>
                        <span className="text-xl font-extrabold tabular-nums text-[#0f172a]">
                          {formatCurrencyTRY(shareAmount)}
                        </span>
                      </div>

                      {showPaidOutRow && (
                        <div className="mt-2 border-t border-[#eecbad] pt-2 text-[11px] font-medium text-[#475569]">
                          Bu dönem kasadan ödediği:{" "}
                          <strong className="font-bold text-[#cd853f]">
                            {formatCurrencyTRY(paidAmount)}
                          </strong>
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </section>

        {/* 4. Navigation Tabs: Gider Kalemleri vs Aylık Değişim Grafikleri + Action Button */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eecbad] pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveViewTab("cards")}
              className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-extrabold transition ${
                activeViewTab === "cards"
                  ? "bg-[#cd853f] text-white shadow-sm"
                  : "bg-white text-[#475569] border border-[#eecbad] hover:text-[#0f172a]"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              <span>
                {room.type === "DORM"
                  ? "Yurt Gider Kalemleri & Bölüşüm"
                  : "Ev Fatura Kalemleri & Bölüşüm"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveViewTab("analytics")}
              className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-extrabold transition ${
                activeViewTab === "analytics"
                  ? "bg-[#cd853f] text-white shadow-sm"
                  : "bg-white text-[#475569] border border-[#eecbad] hover:text-[#0f172a]"
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Her Kalem İçin Ayrı Aylık Grafik & Analiz</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setDefaultExpenseCategoryId(undefined);
              setIsAddExpenseOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#cd853f] px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#b57232]"
          >
            <Sparkles className="h-4 w-4" />
            <span>+ Yeni Gider / Hizmet Ekle (Damacana Su vb.)</span>
          </button>
        </div>

        {/* 5. Tab Content: Either Category Ledger Cards + Embedded Analytics OR Full Analytics Grid */}
        {activeViewTab === "cards" ? (
          <div className="space-y-10">
            <section className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {room.categories.map((category) => {
                const allCategoryExpenses = room.expenses.filter(
                  (e) => e.categoryId === category.id
                );
                const catPeriodExpenses = allCategoryExpenses.filter(
                  (e) => e.periodId === selectedPeriod.id
                );

                const prevPeriodTotal = previousPeriod
                  ? allCategoryExpenses
                      .filter((e) => e.periodId === previousPeriod.id)
                      .reduce((s, e) => s + e.amount, 0)
                  : null;

                return (
                  <ExpenseCategoryCard
                    key={category.id}
                    category={category}
                    members={room.members}
                    selectedPeriod={selectedPeriod}
                    periodExpenses={catPeriodExpenses}
                    allCategoryExpenses={allCategoryExpenses}
                    allPeriods={room.periods}
                    previousPeriodTotal={prevPeriodTotal}
                    onQuickAddExpense={(catId) => {
                      setDefaultExpenseCategoryId(catId);
                      setIsAddExpenseOpen(true);
                    }}
                    onEditExpense={handleEditExpense}
                    onDeleteExpense={handleDeleteExpense}
                    onConfigureCategorySplit={(catId) => {
                      setSplitTargetCategoryId(catId);
                      setIsSplitModalOpen(true);
                    }}
                    onToggleZeroConfirmed={handleToggleZeroConfirmed}
                  />
                );
              })}
            </section>

            {/* Also render the CategoryAnalyticsGrid directly underneath so users see all individual monthly charts immediately */}
            <CategoryAnalyticsGrid
              categories={room.categories}
              periods={room.periods}
              expenses={room.expenses}
            />
          </div>
        ) : (
          <CategoryAnalyticsGrid
            categories={room.categories}
            periods={room.periods}
            expenses={room.expenses}
          />
        )}
      </div>

      {/* Add Expense / Custom Service Modal */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        categories={room.categories}
        members={room.members}
        periods={room.periods}
        availableHistoricalTemplates={availableHistoricalTemplates}
        defaultCategoryId={defaultExpenseCategoryId}
        selectedPeriodId={selectedPeriod.id}
        currentMemberId={currentMemberId}
        roomType={room.type}
        onSubmitExpense={handleAddExpense}
      />

      {/* Dynamic Split Ratio Modal */}
      <SplitRatioModal
        isOpen={isSplitModalOpen}
        onClose={() => setIsSplitModalOpen(false)}
        categories={room.categories}
        members={room.members}
        initialCategoryId={splitTargetCategoryId}
        selectedPeriodId={selectedPeriod.id}
        onSaveSplits={handleSaveSplits}
      />

      {/* Roommates Management Modal */}
      <RoommatesModal
        isOpen={isRoommatesModalOpen}
        onClose={() => setIsRoommatesModalOpen(false)}
        roomCode={room.code}
        members={room.members}
        onAddMember={handleAddRoommate}
        onRemoveMember={handleRemoveRoommate}
      />
    </main>
  );
}
