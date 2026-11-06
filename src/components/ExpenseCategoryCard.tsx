"use client";

import React, { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
  TrendingDown,
  TrendingUp,
  Minus,
  X,
} from "lucide-react";
import {
  BillingPeriodItem,
  ExpenseItem,
  RoomCategory,
  RoomMember,
} from "@/types/housemate";
import { CategoryIcon, formatCurrencyTRY } from "./CategoryIcon";

interface ExpenseCategoryCardProps {
  category: RoomCategory;
  members: RoomMember[];
  selectedPeriod: BillingPeriodItem;
  periodExpenses: ExpenseItem[];
  allCategoryExpenses: ExpenseItem[];
  allPeriods: BillingPeriodItem[];
  previousPeriodTotal: number | null;
  onQuickAddExpense: (categoryId: string) => void;
  onEditExpense: (
    expenseId: string,
    payload: { amount: number; title: string; paidById: string }
  ) => Promise<void>;
  onDeleteExpense: (expenseId: string) => void;
  onConfigureCategorySplit: (categoryId: string) => void;
  onToggleZeroConfirmed: (
    categoryId: string,
    isZeroConfirmed: boolean
  ) => Promise<void>;
}

export function ExpenseCategoryCard({
  category,
  members,
  selectedPeriod,
  periodExpenses,
  allCategoryExpenses,
  allPeriods,
  previousPeriodTotal,
  onQuickAddExpense,
  onEditExpense,
  onDeleteExpense,
  onConfigureCategorySplit,
  onToggleZeroConfirmed,
}: ExpenseCategoryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");
  const [editTitle, setEditTitle] = useState<string>("");
  const [editPaidById, setEditPaidById] = useState<string>("");
  const [isTogglingZero, setIsTogglingZero] = useState(false);

  const totalAmount = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
  const entryCount = periodExpenses.length;

  const isZeroConfirmed =
    selectedPeriod.periodSplits?.some(
      (ps) => ps.categoryId === category.id && ps.isZeroConfirmed
    ) ?? false;
  const isPendingBill =
    selectedPeriod.isActive && totalAmount === 0 && !isZeroConfirmed;

  const getMemberPercentage = (memberId: string): number => {
    const periodSplit = selectedPeriod.periodSplits?.find(
      (ps) => ps.categoryId === category.id && ps.memberId === memberId
    );
    if (periodSplit !== undefined) return periodSplit.percentage;

    const catSplit = category.splits?.find((s) => s.memberId === memberId);
    if (catSplit !== undefined) return catSplit.percentage;

    return members.length > 0 ? Number((100 / members.length).toFixed(1)) : 100;
  };

  let trendDiffPct: number | null = null;
  if (
    previousPeriodTotal !== null &&
    previousPeriodTotal > 0 &&
    (totalAmount > 0 || isZeroConfirmed)
  ) {
    trendDiffPct =
      ((totalAmount - previousPeriodTotal) / previousPeriodTotal) * 100;
  }

  // Last 4 billed periods mini-bars for visual trajectory directly on the card
  // Exclude active period if it is currently in "Pending Bill" (unconfirmed 0 TL) state
  const billedPeriods = [...allPeriods]
    .sort((a, b) => a.periodKey.localeCompare(b.periodKey))
    .filter((p) => {
      if (!p.isActive) return true;
      const sum = allCategoryExpenses
        .filter((e) => e.periodId === p.id)
        .reduce((a, b) => a + b.amount, 0);
      const zeroConfirmedForP =
        p.periodSplits?.some(
          (ps) => ps.categoryId === category.id && ps.isZeroConfirmed
        ) ?? false;
      return sum > 0 || zeroConfirmedForP;
    });

  const sortedPeriods = (
    billedPeriods.length > 0 ? billedPeriods : [...allPeriods]
  ).slice(-4);
  const miniHistory = sortedPeriods.map((p) => {
    const sum = allCategoryExpenses
      .filter((e) => e.periodId === p.id)
      .reduce((a, b) => a + b.amount, 0);
    return {
      id: p.id,
      shortName: p.label.split(" ").slice(0, 2).join(" "),
      amount: sum,
      isCurrentSelected: p.id === selectedPeriod.id,
    };
  });
  const maxMiniAmount = Math.max(...miniHistory.map((m) => m.amount), 1);

  async function handleToggleZero(nextVal: boolean) {
    try {
      setIsTogglingZero(true);
      await onToggleZeroConfirmed(category.id, nextVal);
    } finally {
      setIsTogglingZero(false);
    }
  }

  function startEditing(exp: ExpenseItem) {
    setEditingId(exp.id);
    setEditAmount(String(exp.amount));
    setEditTitle(exp.title);
    setEditPaidById(exp.paidById);
  }

  async function saveEdit(expenseId: string) {
    const parsed = Number(editAmount.replace(",", "."));
    if (Number.isNaN(parsed) || parsed <= 0) return;
    await onEditExpense(expenseId, {
      amount: parsed,
      title: editTitle,
      paidById: editPaidById,
    });
    setEditingId(null);
  }

  return (
    <div className="flex flex-col justify-between rounded-3xl border border-[#eecbad] bg-white p-5 shadow-sm transition hover:border-[#cd853f]/60 hover:shadow-premium">
      {/* Top Row: Category Icon, Name, Aggregation Count & Trend Badge */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eecbad]/45 text-[#cd853f] border border-[#eecbad]">
              <CategoryIcon
                name={category.name}
                iconKey={category.icon}
                className="h-6 w-6"
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="text-base font-extrabold text-[#0f172a]">
                  {category.name}
                </h3>
                {entryCount > 1 && (
                  <span className="rounded-md bg-[#97ffff] px-2 py-0.5 text-[11px] font-extrabold text-[#0f172a]">
                    {entryCount} Harcama Toplamı
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onConfigureCategorySplit(category.id)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#475569] underline decoration-[#eecbad] underline-offset-2 transition hover:text-[#cd853f]"
                >
                  <SlidersHorizontal className="h-3 w-3 text-[#cd853f]" />
                  {category.hasCustomSplit
                    ? "Özel Bölüşüm Oranı"
                    : "Eşit Bölüşüm"}
                </button>
              </div>
            </div>
          </div>

          {/* Trend Badge vs Previous Period */}
          <div className="flex flex-col items-end gap-1">
            {isPendingBill ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-[#eecbad]/60 px-2.5 py-1 text-[11px] font-extrabold text-[#0f172a] border border-[#cd853f]/50">
                <Clock className="h-3 w-3 text-[#cd853f]" />
                Fatura Bekleniyor
              </span>
            ) : totalAmount === 0 && isZeroConfirmed ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-[#97ffff] px-2.5 py-1 text-[11px] font-extrabold text-[#0f172a]">
                <Check className="h-3 w-3 text-[#0f172a]" />
                Gider Yok (₺0)
              </span>
            ) : trendDiffPct !== null ? (
              <span
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-extrabold ${
                  trendDiffPct > 0.5
                    ? "bg-amber-100 text-amber-950"
                    : trendDiffPct < -0.5
                    ? "bg-[#97ffff] text-[#0f172a]"
                    : "bg-[#eecbad]/50 text-[#0f172a]"
                }`}
              >
                {trendDiffPct > 0.5 ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-[#cd853f]" />%
                    {Math.abs(trendDiffPct).toFixed(0)} Artış
                  </>
                ) : trendDiffPct < -0.5 ? (
                  <>
                    <TrendingDown className="h-3 w-3 text-[#0f172a]" />%
                    {Math.abs(trendDiffPct).toFixed(0)} Azalış
                  </>
                ) : (
                  <>
                    <Minus className="h-3 w-3" />
                    Değişim Yok
                  </>
                )}
              </span>
            ) : (
              <span className="rounded-lg bg-[#faf8f5] px-2 py-0.5 text-[10px] font-semibold text-[#475569] border border-[#eecbad]">
                İlk Dönem Verisi
              </span>
            )}
          </div>
        </div>

        {/* Total Amount & Quick Add Button */}
        <div className="mt-4 flex items-baseline justify-between rounded-2xl bg-[#faf8f5] px-4 py-3 border border-[#eecbad]/80">
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-[#475569]">
              Dönem Toplamı
            </span>
            {isPendingBill ? (
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold text-[#cd853f]">
                  ⏳ Fatura Bekleniyor
                </span>
              </div>
            ) : (
              <span className="text-2xl font-extrabold tabular-nums text-[#0f172a]">
                {formatCurrencyTRY(totalAmount)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => onQuickAddExpense(category.id)}
            className="inline-flex items-center gap-1 rounded-xl bg-[#cd853f] px-3.5 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#b57232] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>Tutar Ekle</span>
          </button>
        </div>

        {/* Hybrid Pending Bill / Zero Confirmed Toggle Strip (shown when active period has 0 TL) */}
        {selectedPeriod.isActive && totalAmount === 0 && (
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#eecbad] bg-[#eecbad]/25 px-3 py-2 text-[11px]">
            <span className="font-semibold text-[#475569]">
              {isZeroConfirmed
                ? "Bu ay gider olmadığı (₺0) onaylandı. Grafikte ₺0 görünür."
                : "Henüz fatura girilmedi; grafik 0'a çakılmaz."}
            </span>
            <button
              type="button"
              disabled={isTogglingZero}
              onClick={() => handleToggleZero(!isZeroConfirmed)}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition ${
                isZeroConfirmed
                  ? "border border-[#cd853f]/50 bg-white text-[#0f172a] hover:bg-[#eecbad]/40"
                  : "bg-[#97ffff] text-[#0f172a] shadow-sm hover:opacity-90"
              }`}
            >
              {isZeroConfirmed ? (
                <>
                  <Clock className="h-3 w-3 text-[#cd853f]" />
                  <span>Fatura Bekleniyor Yap</span>
                </>
              ) : (
                <>
                  <Check className="h-3 w-3 text-[#0f172a]" />
                  <span>Bu Ay Gider Yok (₺0)</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Mini 4-Month Trajectory Strip inside the Card */}
        {miniHistory.length > 1 && (
          <div className="mt-3 rounded-2xl border border-[#eecbad]/60 bg-[#faf8f5]/70 px-3 py-2">
            <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#475569]">
              <span>Son Dönemler Trendi</span>
              {previousPeriodTotal !== null && previousPeriodTotal > 0 && (
                <span>Önceki: {formatCurrencyTRY(previousPeriodTotal)}</span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2 items-end h-10 pt-1">
              {miniHistory.map((mh) => {
                const heightPct = Math.max(
                  18,
                  Math.round((mh.amount / maxMiniAmount) * 100)
                );
                return (
                  <div
                    key={mh.id}
                    className="flex flex-col items-center justify-end h-full"
                    title={`${mh.shortName}: ${formatCurrencyTRY(mh.amount)}`}
                  >
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-md transition-all ${
                        mh.isCurrentSelected
                          ? "bg-[#cd853f]"
                          : "bg-[#eecbad] hover:bg-[#cd853f]/60"
                      }`}
                    />
                    <span className="mt-1 w-full truncate text-center text-[9px] font-bold text-[#475569]">
                      {mh.shortName.split(" ")[1] || mh.shortName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dynamic Per-Person Share Breakdown */}
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#475569]">
            <span>Kişi Başı Düşen Pay</span>
            <span>Bölüşüm Oranı</span>
          </div>
          <div className="space-y-1.5">
            {members.map((member) => {
              const pct = getMemberPercentage(member.id);
              const shareAmount = (totalAmount * pct) / 100;
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-xl border border-[#eecbad]/60 bg-[#eecbad]/20 px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: member.avatarColor || "#cd853f" }}
                    />
                    <span className="font-bold text-[#0f172a]">
                      {member.name}
                    </span>
                    <span className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[11px] font-bold text-[#475569] border border-[#eecbad]">
                      %{pct.toFixed(1).replace(".0", "")}
                    </span>
                  </div>
                  <span className="font-extrabold tabular-nums text-[#0f172a]">
                    {formatCurrencyTRY(shareAmount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom: Sub-Entries Accordion (Who Paid, Inline Edit & Delete) */}
      <div className="mt-4 border-t border-[#eecbad]/70 pt-3">
        {entryCount === 0 ? (
          <p className="text-center text-xs font-medium text-[#475569]">
            Bu dönemde henüz{" "}
            <strong className="text-[#0f172a]">{category.name}</strong> girişi
            yapılmadı.
          </p>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-xl px-2 py-1 text-xs font-bold text-[#1e293b] transition hover:bg-[#eecbad]/30"
            >
              <span>
                {entryCount === 1
                  ? `Ödeyen: ${periodExpenses[0].paidBy?.name || "Üye"} (${
                      periodExpenses[0].title
                    })`
                  : `${entryCount} Alt Harcama & Kim Ödedi Detayını Gör`}
              </span>
              {expanded ? (
                <ChevronUp className="h-4 w-4 text-[#cd853f]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[#cd853f]" />
              )}
            </button>

            {expanded && (
              <div className="mt-2.5 space-y-2 rounded-2xl bg-[#faf8f5] p-3 border border-[#eecbad]">
                {periodExpenses.map((exp) =>
                  editingId === exp.id ? (
                    <div
                      key={exp.id}
                      className="space-y-2 rounded-xl border-2 border-[#cd853f] bg-white p-2.5 text-xs"
                    >
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full rounded-lg border border-[#eecbad] bg-[#faf8f5] px-2.5 py-1.5 font-bold text-[#0f172a] outline-none"
                        placeholder="Açıklama"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="w-24 rounded-lg border border-[#eecbad] bg-[#faf8f5] px-2.5 py-1.5 font-extrabold text-[#0f172a] outline-none"
                        />
                        <select
                          value={editPaidById}
                          onChange={(e) => setEditPaidById(e.target.value)}
                          className="flex-1 rounded-lg border border-[#eecbad] bg-[#faf8f5] px-2 py-1.5 font-bold text-[#0f172a] outline-none"
                        >
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => saveEdit(exp.id)}
                          className="rounded-lg bg-[#cd853f] p-1.5 text-white hover:bg-[#b57232]"
                          title="Kaydet"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-lg border border-[#eecbad] p-1.5 text-[#475569]"
                          title="İptal"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={exp.id}
                      className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-xs border border-[#eecbad]/70 shadow-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-[#0f172a]">
                          {exp.title}
                        </p>
                        <p className="text-[11px] font-medium text-[#475569]">
                          Ödeyen:{" "}
                          <strong className="text-[#cd853f]">
                            {exp.paidBy?.name}
                          </strong>{" "}
                          •{" "}
                          {new Date(exp.expenseDate).toLocaleDateString(
                            "tr-TR",
                            {
                              day: "numeric",
                              month: "short",
                            }
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold tabular-nums text-[#0f172a]">
                          {formatCurrencyTRY(exp.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => startEditing(exp)}
                          title="Düzenle"
                          className="rounded-lg p-1 text-[#475569] transition hover:bg-[#eecbad]/40 hover:text-[#0f172a]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteExpense(exp.id)}
                          title="Bu gider kaydını sil"
                          className="rounded-lg p-1 text-[#475569] transition hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
