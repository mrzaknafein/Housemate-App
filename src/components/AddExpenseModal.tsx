"use client";

import React, { useEffect, useState } from "react";
import { Plus, Receipt, Sparkles, X } from "lucide-react";
import {
  BillingPeriodItem,
  HistoricalPeriodTemplate,
  RoomCategory,
  RoomMember,
} from "@/types/housemate";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: RoomCategory[];
  members: RoomMember[];
  periods: BillingPeriodItem[];
  availableHistoricalTemplates: HistoricalPeriodTemplate[];
  defaultCategoryId?: string;
  selectedPeriodId: string;
  currentMemberId?: string;
  roomType: "HOUSE" | "DORM";
  onSubmitExpense: (payload: {
    categoryId?: string;
    customCategoryName?: string;
    amount: number;
    paidById: string;
    title: string;
    periodId?: string;
    periodKey?: string;
  }) => Promise<void>;
}

export function AddExpenseModal({
  isOpen,
  onClose,
  categories,
  members,
  periods,
  availableHistoricalTemplates,
  defaultCategoryId,
  selectedPeriodId,
  currentMemberId,
  roomType,
  onSubmitExpense,
}: AddExpenseModalProps) {
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [categoryId, setCategoryId] = useState(defaultCategoryId || "");
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [amount, setAmount] = useState("");
  const [paidById, setPaidById] = useState(
    currentMemberId || members[0]?.id || ""
  );
  const [title, setTitle] = useState("");
  const [periodChoice, setPeriodChoice] = useState<string>(selectedPeriodId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setAmount("");
      setTitle("");
      if (defaultCategoryId) {
        setIsCustomCategory(false);
        setCategoryId(defaultCategoryId);
      } else {
        setIsCustomCategory(false);
        setCategoryId(categories[0]?.id || "");
      }
      setPaidById(currentMemberId || members[0]?.id || "");
      setPeriodChoice(selectedPeriodId);
    }
  }, [
    isOpen,
    defaultCategoryId,
    categories,
    currentMemberId,
    members,
    selectedPeriodId,
  ]);

  if (!isOpen) return null;

  const existingPeriodMap = new Map(periods.map((p) => [p.periodKey, p]));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedAmount = Number(amount.replace(",", "."));
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Lütfen 0'dan büyük geçerli bir tutar girin.");
      return;
    }

    if (isCustomCategory && customCategoryName.trim().length < 2) {
      setError("Lütfen yeni gider/hizmet adını yazın (Örn: Damacana Su).");
      return;
    }

    setSubmitting(true);
    try {
      const isHistoricalTemplateKey = periodChoice.startsWith("tpl:");
      const resolvedPeriodKey = isHistoricalTemplateKey
        ? periodChoice.replace("tpl:", "")
        : undefined;
      const resolvedPeriodId = !isHistoricalTemplateKey
        ? periodChoice
        : undefined;

      await onSubmitExpense({
        categoryId: isCustomCategory ? undefined : categoryId,
        customCategoryName: isCustomCategory
          ? customCategoryName.trim()
          : undefined,
        amount: parsedAmount,
        paidById,
        title: title.trim(),
        periodId: resolvedPeriodId,
        periodKey: resolvedPeriodKey,
      });
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Gider eklenirken bir hata oluştu."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const quickCustomSuggestions =
    roomType === "HOUSE"
      ? ["Damacana Su", "Apartman Aidatı", "Temizlik Malzemesi", "Ortak Market"]
      : ["Damacana Su", "Gece Kahvesi", "Fotokopi / Kırtasiye", "Ortak Yemek"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/45 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-lg rounded-3xl border border-[#eecbad] bg-white p-6 shadow-premium">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#eecbad] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#cd853f] text-white">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[#0f172a]">
                Fatura veya Özel Gider Ekle
              </h3>
              <p className="text-xs text-[#475569]">
                Aynı ay içindeki aynı isimli giderler otomatik olarak tek
                kalemde toplanır.
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
          {/* Category Mode Toggle: Existing vs New Custom Service */}
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#faf8f5] p-1.5 border border-[#eecbad]">
            <button
              type="button"
              onClick={() => setIsCustomCategory(false)}
              className={`rounded-xl py-2 text-xs font-extrabold transition ${
                !isCustomCategory
                  ? "bg-[#cd853f] text-white shadow-sm"
                  : "text-[#475569] hover:text-[#0f172a]"
              }`}
            >
              Mevcut Gider Kalemi
            </button>
            <button
              type="button"
              onClick={() => setIsCustomCategory(true)}
              className={`inline-flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-extrabold transition ${
                isCustomCategory
                  ? "bg-[#cd853f] text-white shadow-sm"
                  : "text-[#475569] hover:text-[#0f172a]"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />+ Yeni Gider / Hizmet Tanımla
            </button>
          </div>

          {!isCustomCategory ? (
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#1e293b]">
                Gider Kalemi Seçin *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-[#eecbad] bg-[#faf8f5] px-4 py-3 text-sm font-bold text-[#0f172a] outline-none focus:border-[#cd853f] focus:bg-white"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} {cat.isDefault ? "(Sabit Kalem)" : "(Özel Kalem)"}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#1e293b]">
                Yeni veya Tekrarlayan Özel Gider Adı *
              </label>
              <input
                type="text"
                required
                placeholder="Örn: Damacana Su, Apartman Aidatı..."
                value={customCategoryName}
                onChange={(e) => setCustomCategoryName(e.target.value)}
                className="w-full rounded-xl border border-[#eecbad] bg-[#faf8f5] px-4 py-3 text-sm font-bold text-[#0f172a] placeholder-[#475569]/60 outline-none focus:border-[#cd853f] focus:bg-white"
              />
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-[#475569]">
                  Hızlı Seçim:
                </span>
                {quickCustomSuggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCustomCategoryName(item)}
                    className="rounded-lg border border-[#eecbad] bg-[#eecbad]/30 px-2.5 py-1 text-[11px] font-bold text-[#0f172a] transition hover:bg-[#cd853f] hover:text-white"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Amount & Who Paid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#1e293b]">
                Tutar (TL) *
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                placeholder="Örn: 450"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-[#eecbad] bg-[#faf8f5] px-4 py-3 text-base font-extrabold tabular-nums text-[#0f172a] placeholder-[#475569]/50 outline-none focus:border-[#cd853f] focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#1e293b]">
                Bunu Kim Ödedi? *
              </label>
              <select
                value={paidById}
                onChange={(e) => setPaidById(e.target.value)}
                className="w-full rounded-xl border border-[#eecbad] bg-[#faf8f5] px-4 py-3 text-sm font-bold text-[#0f172a] outline-none focus:border-[#cd853f] focus:bg-white"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Target Period (Active or Any Past Month!) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#1e293b]">
                Ait Olduğu Dönem (Geçmiş Ay Seçilebilir)
              </label>
              <select
                value={periodChoice}
                onChange={(e) => setPeriodChoice(e.target.value)}
                className="w-full rounded-xl border border-[#eecbad] bg-[#faf8f5] px-3.5 py-2.5 text-xs font-bold text-[#0f172a] outline-none focus:border-[#cd853f] focus:bg-white"
              >
                <optgroup label="Mevcut Dönemler">
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} {p.isActive ? "(Aktif)" : "(Geçmiş)"}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Diğer Geçmiş Aylar (Otomatik Oluşturur)">
                  {availableHistoricalTemplates
                    .filter((tpl) => !existingPeriodMap.has(tpl.periodKey))
                    .map((tpl) => (
                      <option key={tpl.periodKey} value={`tpl:${tpl.periodKey}`}>
                        + {tpl.label} (Geçmiş Ay Ekle)
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#1e293b]">
                Açıklama / Alt Not (İsteğe Bağlı)
              </label>
              <input
                type="text"
                placeholder="Örn: 19L Erikli Su veya Ekim Faturası"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-[#eecbad] bg-[#faf8f5] px-3.5 py-2.5 text-xs font-semibold text-[#0f172a] placeholder-[#475569]/60 outline-none focus:border-[#cd853f] focus:bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#eecbad] px-4 py-2.5 text-xs font-bold text-[#475569] hover:bg-[#faf8f5]"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#cd853f] px-6 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#b57232] disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              <span>{submitting ? "Kaydediliyor..." : "Gideri Kaydet"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
