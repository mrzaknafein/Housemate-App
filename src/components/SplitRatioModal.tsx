"use client";

import React, { useEffect, useState } from "react";
import { Check, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { RoomCategory, RoomMember } from "@/types/housemate";

interface SplitRatioModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: RoomCategory[];
  members: RoomMember[];
  initialCategoryId?: string;
  selectedPeriodId: string;
  onSaveSplits: (payload: {
    categoryId?: string;
    applyToAll: boolean;
    resetToEqual: boolean;
    periodId: string;
    splits: Array<{ memberId: string; percentage: number }>;
  }) => Promise<void>;
}

export function SplitRatioModal({
  isOpen,
  onClose,
  categories,
  members,
  initialCategoryId,
  selectedPeriodId,
  onSaveSplits,
}: SplitRatioModalProps) {
  const [applyToAll, setApplyToAll] = useState(!initialCategoryId);
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    initialCategoryId || categories[0]?.id || ""
  );
  const [percentages, setPercentages] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    const targetCatId = initialCategoryId || categories[0]?.id || "";
    setSelectedCategoryId(targetCatId);
    setApplyToAll(!initialCategoryId);

    const cat = categories.find((c) => c.id === targetCatId);
    const nextMap: Record<string, number> = {};
    const defaultEqual =
      members.length > 0 ? Number((100 / members.length).toFixed(1)) : 100;

    members.forEach((m, idx) => {
      const found = cat?.splits.find((s) => s.memberId === m.id);
      if (found !== undefined) {
        nextMap[m.id] = found.percentage;
      } else if (idx === members.length - 1) {
        const sumOthers = Object.values(nextMap).reduce((a, b) => a + b, 0);
        nextMap[m.id] = Number((100 - sumOthers).toFixed(1));
      } else {
        nextMap[m.id] = defaultEqual;
      }
    });
    setPercentages(nextMap);
  }, [isOpen, initialCategoryId, categories, members]);

  if (!isOpen) return null;

  function handleCategorySwitch(newCatId: string) {
    setSelectedCategoryId(newCatId);
    const cat = categories.find((c) => c.id === newCatId);
    if (!cat) return;
    const nextMap: Record<string, number> = {};
    members.forEach((m) => {
      const found = cat.splits.find((s) => s.memberId === m.id);
      nextMap[m.id] =
        found !== undefined
          ? found.percentage
          : Number((100 / members.length).toFixed(1));
    });
    setPercentages(nextMap);
  }

  function handlePercentageChange(memberId: string, val: string) {
    const num = Math.max(0, Math.min(100, Number(val) || 0));
    const updated = { ...percentages, [memberId]: num };

    // If there are exactly 2 roommates, auto-balance the second roommate to 100 - num!
    if (members.length === 2) {
      const otherMember = members.find((m) => m.id !== memberId);
      if (otherMember) {
        updated[otherMember.id] = Number((100 - num).toFixed(1));
      }
    }
    setPercentages(updated);
  }

  function handleEqualizePreview() {
    const count = members.length;
    if (count === 0) return;
    const base = Math.floor((100 / count) * 10) / 10;
    const nextMap: Record<string, number> = {};
    let sum = 0;
    members.forEach((m, idx) => {
      if (idx === count - 1) {
        nextMap[m.id] = Number((100 - sum).toFixed(1));
      } else {
        nextMap[m.id] = base;
        sum += base;
      }
    });
    setPercentages(nextMap);
  }

  const totalPct = Object.values(percentages).reduce((a, b) => a + b, 0);
  const isTotalValid = Math.abs(totalPct - 100) <= 0.5;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isTotalValid) {
      setError(
        `Oranların toplamı %100 olmalıdır. Şu anki toplam: %${totalPct.toFixed(1)}`
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSaveSplits({
        categoryId: selectedCategoryId,
        applyToAll,
        resetToEqual: false,
        periodId: selectedPeriodId,
        splits: members.map((m) => ({
          memberId: m.id,
          percentage: percentages[m.id] ?? 0,
        })),
      });
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Oranlar kaydedilirken hata oluştu."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleResetToDefaultEqual() {
    setSaving(true);
    setError(null);
    try {
      await onSaveSplits({
        categoryId: selectedCategoryId,
        applyToAll,
        resetToEqual: true,
        periodId: selectedPeriodId,
        splits: [],
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/45 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-lg rounded-3xl border border-[#eecbad] bg-white p-6 shadow-premium">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#eecbad] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#97ffff] text-[#0f172a]">
              <SlidersHorizontal className="h-5 w-5 text-[#0f172a]" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[#0f172a]">
                Dinamik Bölüşüm Oranı (%) Ayarları
              </h3>
              <p className="text-xs text-[#475569]">
                İster tüm giderler için, ister sadece belirli bir kalem (Örn:
                Kira %60-%40) için özelleştirin.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-[#475569] hover:bg-[#eecbad]/40 hover:text-[#0f172a]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-900">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Scope Selector: Single Category vs All Categories */}
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#faf8f5] p-1.5 border border-[#eecbad]">
            <button
              type="button"
              onClick={() => setApplyToAll(false)}
              className={`rounded-xl py-2 text-xs font-extrabold transition ${
                !applyToAll
                  ? "bg-[#cd853f] text-white shadow-sm"
                  : "text-[#475569] hover:text-[#0f172a]"
              }`}
            >
              Belirli Bir Gider Kalemi İçin
            </button>
            <button
              type="button"
              onClick={() => setApplyToAll(true)}
              className={`rounded-xl py-2 text-xs font-extrabold transition ${
                applyToAll
                  ? "bg-[#cd853f] text-white shadow-sm"
                  : "text-[#475569] hover:text-[#0f172a]"
              }`}
            >
              Tüm Kalemlere Uygula
            </button>
          </div>

          {!applyToAll && (
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#1e293b]">
                Özelleştirilecek Gider Kalemi
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => handleCategorySwitch(e.target.value)}
                className="w-full rounded-xl border border-[#eecbad] bg-[#faf8f5] px-4 py-2.5 text-sm font-bold text-[#0f172a] outline-none focus:border-[#cd853f]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{" "}
                    {c.hasCustomSplit ? "(Özel Oranlı)" : "(Varsayılan Eşit)"}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Member Sliders & Percentage Inputs */}
          <div className="space-y-3 rounded-2xl border border-[#eecbad] bg-[#faf8f5] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                Kişi Bazlı Yüzdeler ({members.length} Kişi)
              </span>
              <button
                type="button"
                onClick={handleEqualizePreview}
                className="inline-flex items-center gap-1 rounded-lg bg-[#97ffff] px-2.5 py-1 text-[11px] font-extrabold text-[#0f172a] transition hover:brightness-95"
              >
                <RotateCcw className="h-3 w-3 text-[#0f172a]" />
                Eşit Bölüştür (%
                {(100 / Math.max(1, members.length)).toFixed(1).replace(".0", "")}
                )
              </button>
            </div>

            {members.map((member) => {
              const val = percentages[member.id] ?? 0;
              return (
                <div
                  key={member.id}
                  className="rounded-xl border border-[#eecbad] bg-white p-3"
                >
                  <div className="flex items-center justify-between gap-3">
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
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#475569]">%</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={val}
                        onChange={(e) =>
                          handlePercentageChange(member.id, e.target.value)
                        }
                        className="w-20 rounded-lg border border-[#eecbad] bg-[#faf8f5] px-2.5 py-1 text-right font-mono text-sm font-extrabold text-[#0f172a] outline-none focus:border-[#cd853f]"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={val}
                    onChange={(e) =>
                      handlePercentageChange(member.id, e.target.value)
                    }
                    className="mt-2.5 h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#eecbad] accent-[#cd853f]"
                  />
                </div>
              );
            })}

            <div className="flex items-center justify-between pt-1 text-xs font-bold">
              <span className="text-[#475569]">Toplam Oran:</span>
              <span
                className={`rounded-lg px-2.5 py-1 font-mono text-xs font-extrabold ${
                  isTotalValid
                    ? "bg-[#97ffff] text-[#0f172a]"
                    : "bg-red-100 text-red-900"
                }`}
              >
                %{totalPct.toFixed(1)} {isTotalValid ? "✓" : "(%100 Olmalı)"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={handleResetToDefaultEqual}
              disabled={saving}
              className="rounded-xl border border-[#eecbad] bg-[#eecbad]/30 px-3.5 py-2.5 text-xs font-bold text-[#0f172a] hover:bg-[#eecbad]/60"
            >
              Varsayılan Otomatik Eşitliğe Döndür
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[#eecbad] px-4 py-2.5 text-xs font-bold text-[#475569]"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={saving || !isTotalValid}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#cd853f] px-5 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#b57232] disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                <span>{saving ? "Kaydediliyor..." : "Oranları Uygula"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
