"use client";

import React, { useState } from "react";
import {
  Calendar,
  CalendarPlus,
  Check,
  ChevronDown,
  Clock,
  History,
  Settings2,
  X,
} from "lucide-react";
import {
  BillingPeriodItem,
  HistoricalPeriodTemplate,
} from "@/types/housemate";

interface BillingPeriodSelectorProps {
  periods: BillingPeriodItem[];
  selectedPeriodId: string;
  onSelectPeriod: (periodId: string) => void;
  availableHistoricalTemplates: HistoricalPeriodTemplate[];
  cycleDay: number;
  onCreateHistoricalPeriod: (periodKey: string) => Promise<string | null>;
  onUpdateCycleDay: (newCycleDay: number) => Promise<void>;
  isCycleModalOpen: boolean;
  setIsCycleModalOpen: (v: boolean) => void;
}

export function BillingPeriodSelector({
  periods,
  selectedPeriodId,
  onSelectPeriod,
  availableHistoricalTemplates,
  cycleDay,
  onCreateHistoricalPeriod,
  onUpdateCycleDay,
  isCycleModalOpen,
  setIsCycleModalOpen,
}: BillingPeriodSelectorProps) {
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>(
    availableHistoricalTemplates[0]?.periodKey || ""
  );
  const [customYear, setCustomYear] = useState<number>(new Date().getFullYear());
  const [customMonth, setCustomMonth] = useState<number>(new Date().getMonth());
  const [useCustomMonthPicker, setUseCustomMonthPicker] = useState(false);

  const [tempCycleDay, setTempCycleDay] = useState<number>(cycleDay);
  const [saving, setSaving] = useState(false);

  // Sort periods descending for dropdown (most recent first)
  const sortedPeriods = [...periods].sort((a, b) =>
    b.periodKey.localeCompare(a.periodKey)
  );
  const currentSelected =
    sortedPeriods.find((p) => p.id === selectedPeriodId) || sortedPeriods[0];

  const existingKeys = new Set(periods.map((p) => p.periodKey));

  async function handleAddPastPeriod(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const targetKey = useCustomMonthPicker
        ? `${customYear}-${String(customMonth + 1).padStart(2, "0")}`
        : selectedTemplateKey;

      if (!targetKey) return;
      const newPeriodId = await onCreateHistoricalPeriod(targetKey);
      if (newPeriodId) {
        onSelectPeriod(newPeriodId);
      }
      setIsHistoryModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCycleDay(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdateCycleDay(tempCycleDay);
      setIsCycleModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#eecbad] bg-white p-4 shadow-sm">
        {/* Left: Active / Selected Period Info */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#97ffff] text-[#0f172a]">
            <Calendar className="h-5 w-5 text-[#0f172a]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                Görüntülenen Fatura Dönemi
              </span>
              {currentSelected?.isActive ? (
                <span className="rounded-md bg-[#97ffff] px-2 py-0.5 text-[11px] font-extrabold text-[#0f172a]">
                  AKTİF DÖNEM
                </span>
              ) : (
                <span className="rounded-md bg-[#eecbad] px-2 py-0.5 text-[11px] font-extrabold text-[#0f172a]">
                  GEÇMİŞ DÖNEM (ARŞİV / MANUEL GİRİŞ AÇIK)
                </span>
              )}
            </div>
            <p className="text-base font-extrabold text-[#0f172a]">
              {currentSelected?.label || "Dönem Seçin"}
            </p>
          </div>
        </div>

        {/* Right: Period Dropdown + "+ Geçmiş Ay/Dönem Ekle" Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Dropdown to switch between existing periods */}
          <div className="relative">
            <select
              value={selectedPeriodId}
              onChange={(e) => onSelectPeriod(e.target.value)}
              className="appearance-none rounded-xl border-2 border-[#eecbad] bg-[#faf8f5] py-2.5 pl-3.5 pr-9 text-xs font-extrabold text-[#0f172a] outline-none transition hover:border-[#cd853f] focus:border-[#cd853f] focus:bg-white"
            >
              {sortedPeriods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} {p.isActive ? "• (Aktif)" : "• (Geçmiş)"}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#cd853f]" />
          </div>

          {/* Button to manually add/enter a past month */}
          <button
            type="button"
            onClick={() => setIsHistoryModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#cd853f] bg-[#eecbad]/35 px-3.5 py-2.5 text-xs font-extrabold text-[#0f172a] transition hover:bg-[#cd853f] hover:text-white"
          >
            <CalendarPlus className="h-4 w-4" />
            <span>+ Geçmiş Ay / Dönem Gir</span>
          </button>

          {/* Cycle Day Adjuster */}
          <button
            type="button"
            onClick={() => {
              setTempCycleDay(cycleDay);
              setIsCycleModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#eecbad] bg-[#faf8f5] px-3 py-2.5 text-xs font-bold text-[#475569] transition hover:border-[#cd853f] hover:text-[#0f172a]"
          >
            <Settings2 className="h-4 w-4 text-[#cd853f]" />
            <span>Döngü Günü ({cycleDay})</span>
          </button>
        </div>
      </div>

      {/* Modal 1: Manually Add / Switch to Past Month */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-lg rounded-3xl border border-[#eecbad] bg-white p-6 shadow-premium">
            <div className="flex items-center justify-between border-b border-[#eecbad] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#97ffff] text-[#0f172a]">
                  <History className="h-5 w-5 text-[#0f172a]" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-[#0f172a]">
                    Geçmiş Ay / Fatura Dönemi Ekle
                  </h3>
                  <p className="text-xs text-[#475569]">
                    Yeni oturum açtığınızda geçmiş aylarınızı elle girip
                    grafikleri hemen oluşturabilirsiniz.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="rounded-xl p-1.5 text-[#475569] hover:bg-[#eecbad]/40 hover:text-[#0f172a]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddPastPeriod} className="mt-5 space-y-4">
              <div className="flex gap-2 rounded-xl bg-[#faf8f5] p-1 border border-[#eecbad]">
                <button
                  type="button"
                  onClick={() => setUseCustomMonthPicker(false)}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                    !useCustomMonthPicker
                      ? "bg-[#cd853f] text-white"
                      : "text-[#475569] hover:text-[#0f172a]"
                  }`}
                >
                  Son 12 Dönemden Seç
                </button>
                <button
                  type="button"
                  onClick={() => setUseCustomMonthPicker(true)}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                    useCustomMonthPicker
                      ? "bg-[#cd853f] text-white"
                      : "text-[#475569] hover:text-[#0f172a]"
                  }`}
                >
                  Özel Yıl & Ay Seç
                </button>
              </div>

              {!useCustomMonthPicker ? (
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#1e293b]">
                    Eklenecek / Veri Girilecek Geçmiş Dönem
                  </label>
                  <select
                    value={selectedTemplateKey}
                    onChange={(e) => setSelectedTemplateKey(e.target.value)}
                    className="w-full rounded-xl border border-[#eecbad] bg-[#faf8f5] px-4 py-3 text-sm font-bold text-[#0f172a] outline-none focus:border-[#cd853f] focus:bg-white"
                  >
                    {availableHistoricalTemplates.map((tpl) => {
                      const alreadyInRoom = existingKeys.has(tpl.periodKey);
                      return (
                        <option key={tpl.periodKey} value={tpl.periodKey}>
                          {tpl.label}{" "}
                          {alreadyInRoom
                            ? "(Mevcut — Seç ve Veri Ekle)"
                            : "(Yeni Geçmiş Dönem Oluştur)"}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#1e293b]">
                      Yıl
                    </label>
                    <input
                      type="number"
                      min={2020}
                      max={2035}
                      value={customYear}
                      onChange={(e) => setCustomYear(Number(e.target.value))}
                      className="w-full rounded-xl border border-[#eecbad] bg-[#faf8f5] px-3.5 py-2.5 text-sm font-bold text-[#0f172a] outline-none focus:border-[#cd853f]"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#1e293b]">
                      Başlangıç Ayı
                    </label>
                    <select
                      value={customMonth}
                      onChange={(e) => setCustomMonth(Number(e.target.value))}
                      className="w-full rounded-xl border border-[#eecbad] bg-[#faf8f5] px-3.5 py-2.5 text-sm font-bold text-[#0f172a] outline-none focus:border-[#cd853f]"
                    >
                      {[
                        "Ocak",
                        "Şubat",
                        "Mart",
                        "Nisan",
                        "Mayıs",
                        "Haziran",
                        "Temmuz",
                        "Ağustos",
                        "Eylül",
                        "Ekim",
                        "Kasım",
                        "Aralık",
                      ].map((mName, idx) => (
                        <option key={mName} value={idx}>
                          {mName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="rounded-2xl bg-[#97ffff] p-3.5 text-xs font-semibold text-[#0f172a]">
                💡 Dönemi ekledikten sonra otomatik olarak o geçmiş döneme
                geçeceksiniz. Orada girdiğiniz tüm Kira, Elektrik, Su veya Özel
                Giderler doğrudan aylık değişim grafiklerine yansır!
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="rounded-xl border border-[#eecbad] px-4 py-2.5 text-xs font-bold text-[#475569] hover:bg-[#faf8f5]"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#cd853f] px-5 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#b57232] disabled:opacity-60"
                >
                  <Check className="h-4 w-4" />
                  <span>
                    {saving ? "Dönem Açılıyor..." : "Döneme Geç & Veri Gir"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Custom Billing Cycle Day Settings (1 - 28) */}
      {isCycleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-3xl border border-[#eecbad] bg-white p-6 shadow-premium">
            <div className="flex items-center justify-between border-b border-[#eecbad] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#97ffff] text-[#0f172a]">
                  <Clock className="h-5 w-5 text-[#0f172a]" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-[#0f172a]">
                    Özelleştirilebilir Ay Döngüsü
                  </h3>
                  <p className="text-xs text-[#475569]">
                    Fatura dönemi sıfırlama gününü (1 - 28) belirleyin.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCycleModalOpen(false)}
                className="rounded-xl p-1.5 text-[#475569] hover:bg-[#eecbad]/40 hover:text-[#0f172a]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCycleDay} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#1e293b]">
                  Ay Döngüsü Sıfırlama Günü
                </label>
                <select
                  value={tempCycleDay}
                  onChange={(e) => setTempCycleDay(Number(e.target.value))}
                  className="w-full rounded-xl border border-[#eecbad] bg-[#faf8f5] px-4 py-3 text-sm font-bold text-[#0f172a] outline-none focus:border-[#cd853f] focus:bg-white"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      Her Ayın {day}. Günü{" "}
                      {day === 1
                        ? "(1 Ekim - 31 Ekim)"
                        : `(Örn: ${day} Ekim - ${day - 1} Kasım Dönemi)`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border border-[#eecbad] bg-[#faf8f5] p-3.5 text-xs text-[#475569]">
                Örneğin döngü günü <strong className="text-[#0f172a]">15</strong>{" "}
                seçildiyse, <strong>15 Ekim - 14 Kasım</strong> arasındaki tüm
                fatura ve gider girişleri tek bir dönem olarak kabul edilir.
                Geçmiş dönemlerin verileri veritabanında korunur.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCycleModalOpen(false)}
                  className="rounded-xl border border-[#eecbad] px-4 py-2.5 text-xs font-bold text-[#475569]"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#cd853f] px-5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-[#b57232] disabled:opacity-60"
                >
                  {saving ? "Kaydediliyor..." : "Döngü Gününü Güncelle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
