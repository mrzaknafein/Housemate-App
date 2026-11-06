"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  SlidersHorizontal,
  Trash2,
  TrendingDown,
  TrendingUp,
  Minus,
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
  previousPeriodTotal: number | null;
  onQuickAddExpense: (categoryId: string) => void;
  onDeleteExpense: (expenseId: string) => void;
  onConfigureCategorySplit: (categoryId: string) => void;
}

export function ExpenseCategoryCard({
  category,
  members,
  selectedPeriod,
  periodExpenses,
  previousPeriodTotal,
  onQuickAddExpense,
  onDeleteExpense,
  onConfigureCategorySplit,
}: ExpenseCategoryCardProps) {
  const [expanded, setExpanded] = useState(false);

  const totalAmount = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
  const entryCount = periodExpenses.length;

  // Resolve split percentages for this period (using frozen periodSplits if available, otherwise category splits)
  const getMemberPercentage = (memberId: string): number => {
    const periodSplit = selectedPeriod.periodSplits?.find(
      (ps) => ps.categoryId === category.id && ps.memberId === memberId
    );
    if (periodSplit !== undefined) return periodSplit.percentage;

    const catSplit = category.splits?.find((s) => s.memberId === memberId);
    if (catSplit !== undefined) return catSplit.percentage;

    return members.length > 0 ? Number((100 / members.length).toFixed(1)) : 100;
  };

  // Trend badge vs previous period
  let trendDiffPct: number | null = null;
  if (
    previousPeriodTotal !== null &&
    previousPeriodTotal > 0 &&
    totalAmount > 0
  ) {
    trendDiffPct =
      ((totalAmount - previousPeriodTotal) / previousPeriodTotal) * 100;
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
            {trendDiffPct !== null ? (
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
            <span className="text-2xl font-extrabold tabular-nums text-[#0f172a]">
              {formatCurrencyTRY(totalAmount)}
            </span>
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

      {/* Bottom: Sub-Entries Accordion (Who Paid & Aggregated Sub-items) */}
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
                {periodExpenses.map((exp) => (
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
                        {new Date(exp.expenseDate).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold tabular-nums text-[#0f172a]">
                        {formatCurrencyTRY(exp.amount)}
                      </span>
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
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
