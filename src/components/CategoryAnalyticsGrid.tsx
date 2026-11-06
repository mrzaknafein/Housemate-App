"use client";

import React, { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  Clock,
  LineChart as LineChartIcon,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  BillingPeriodItem,
  ExpenseItem,
  RoomCategory,
} from "@/types/housemate";
import { CategoryIcon, formatCurrencyTRY } from "./CategoryIcon";

interface CategoryAnalyticsGridProps {
  categories: RoomCategory[];
  periods: BillingPeriodItem[];
  expenses: ExpenseItem[];
}

export function CategoryAnalyticsGrid({
  categories,
  periods,
  expenses,
}: CategoryAnalyticsGridProps) {
  const [chartStyle, setChartStyle] = useState<"area" | "bar">("area");

  // Sort periods chronologically ascending (oldest -> newest)
  const chronologicalPeriods = [...periods].sort((a, b) =>
    a.periodKey.localeCompare(b.periodKey)
  );

  // Filter out the active period from overall chart if it has 0 total expenses and is still waiting for bills
  const overallPeriodsForChart = chronologicalPeriods.filter((p) => {
    if (!p.isActive || chronologicalPeriods.length <= 1) return true;
    const periodTotal = expenses
      .filter((e) => e.periodId === p.id)
      .reduce((acc, e) => acc + e.amount, 0);
    if (periodTotal > 0) return true;
    const anyConfirmedZero =
      p.periodSplits?.some((ps) => ps.isZeroConfirmed) ?? false;
    return anyConfirmedZero;
  });

  const effectiveOverallPeriods =
    overallPeriodsForChart.length > 0
      ? overallPeriodsForChart
      : chronologicalPeriods;

  // Overall Room Total Series across billed periods
  const overallData = effectiveOverallPeriods.map((p, idx) => {
    const periodTotal = expenses
      .filter((e) => e.periodId === p.id)
      .reduce((acc, e) => acc + e.amount, 0);
    const shortLabel =
      p.label.split(" ").slice(0, 3).join(" ") || `Dönem ${idx + 1}`;
    return {
      periodId: p.id,
      periodKey: p.periodKey,
      name: shortLabel,
      fullLabel: p.label,
      total: Number(periodTotal.toFixed(2)),
    };
  });

  const latestOverall =
    overallData.length > 0 ? overallData[overallData.length - 1].total : 0;
  const prevOverall =
    overallData.length > 1 ? overallData[overallData.length - 2].total : null;
  const overallTrendPct =
    prevOverall !== null && prevOverall > 0
      ? ((latestOverall - prevOverall) / prevOverall) * 100
      : null;

  return (
    <section className="space-y-6">
      {/* Section Header & Chart Type Switch */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#eecbad] bg-white p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-[#97ffff] px-2.5 py-0.5 text-xs font-extrabold text-[#0f172a]">
              HER GİDER KALEMİ İÇİN AYRI TREND ANALİZİ
            </span>
          </div>
          <h2 className="mt-1.5 text-xl font-extrabold text-[#0f172a]">
            Aylık Değişim Grafikleri & Dönemsel Karşılaştırma
          </h2>
          <p className="text-xs text-[#475569]">
            Kira, Elektrik, Su, Doğalgaz, İnternet ve Damacana Su gibi tüm sabit
            ve özel kalemlerin dönem bazlı değişimini ayrı ayrı inceleyin.
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-2xl border border-[#eecbad] bg-[#faf8f5] p-1.5">
          <button
            type="button"
            onClick={() => setChartStyle("area")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
              chartStyle === "area"
                ? "bg-[#cd853f] text-white shadow-sm"
                : "text-[#475569] hover:text-[#0f172a]"
            }`}
          >
            <LineChartIcon className="h-4 w-4" />
            <span>Çizgi / Alan Grafiği</span>
          </button>
          <button
            type="button"
            onClick={() => setChartStyle("bar")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
              chartStyle === "bar"
                ? "bg-[#cd853f] text-white shadow-sm"
                : "text-[#475569] hover:text-[#0f172a]"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Sütun Grafiği</span>
          </button>
        </div>
      </div>

      {/* Master Overall Monthly Chart */}
      <div className="rounded-3xl border border-[#eecbad] bg-white p-6 shadow-premium">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#475569]">
              Genel Toplam Gider Seyri ({chronologicalPeriods.length} Dönem)
            </span>
            <div className="mt-1 flex items-center gap-3">
              <h3 className="text-2xl font-extrabold tabular-nums text-[#0f172a]">
                Son Dönem: {formatCurrencyTRY(latestOverall)}
              </h3>
              {overallTrendPct !== null && (
                <span
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-extrabold ${
                    overallTrendPct > 0.5
                      ? "bg-amber-100 text-amber-950"
                      : overallTrendPct < -0.5
                      ? "bg-[#97ffff] text-[#0f172a]"
                      : "bg-[#eecbad]/60 text-[#0f172a]"
                  }`}
                >
                  {overallTrendPct > 0.5 ? (
                    <>
                      <TrendingUp className="h-3.5 w-3.5 text-[#cd853f]" />%
                      {Math.abs(overallTrendPct).toFixed(1)} Artış
                    </>
                  ) : overallTrendPct < -0.5 ? (
                    <>
                      <TrendingDown className="h-3.5 w-3.5 text-[#0f172a]" />%
                      {Math.abs(overallTrendPct).toFixed(1)} Azalış
                    </>
                  ) : (
                    <>
                      <Minus className="h-3.5 w-3.5" /> Sabit
                    </>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartStyle === "area" ? (
              <AreaChart
                data={overallData}
                margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="overallPeru" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#cd853f" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#eecbad" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#eecbad"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#475569", fontSize: 12, fontWeight: 600 }}
                  axisLine={{ stroke: "#eecbad" }}
                />
                <YAxis
                  tick={{ fill: "#475569", fontSize: 12, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₺${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#cd853f",
                    borderRadius: "14px",
                    color: "#0f172a",
                    fontWeight: 700,
                  }}
                  formatter={(value: number) => [
                    formatCurrencyTRY(value),
                    "Toplam Gider",
                  ]}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.fullLabel || ""
                  }
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#cd853f"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#overallPeru)"
                  activeDot={{
                    r: 6,
                    fill: "#97ffff",
                    stroke: "#0f172a",
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            ) : (
              <BarChart
                data={overallData}
                margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#eecbad"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#475569", fontSize: 12, fontWeight: 600 }}
                  axisLine={{ stroke: "#eecbad" }}
                />
                <YAxis
                  tick={{ fill: "#475569", fontSize: 12, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₺${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#cd853f",
                    borderRadius: "14px",
                    color: "#0f172a",
                    fontWeight: 700,
                  }}
                  formatter={(value: number) => [
                    formatCurrencyTRY(value),
                    "Toplam Gider",
                  ]}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.fullLabel || ""
                  }
                />
                <Bar
                  dataKey="total"
                  fill="#cd853f"
                  radius={[10, 10, 0, 0]}
                  maxBarSize={54}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Individual Dedicated Chart Card for EVERY Expense Category */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {categories.map((cat) => {
          const activePeriodObj = chronologicalPeriods.find((p) => p.isActive);
          const activePeriodSum = activePeriodObj
            ? expenses
                .filter(
                  (e) =>
                    e.periodId === activePeriodObj.id && e.categoryId === cat.id
                )
                .reduce((a, b) => a + b.amount, 0)
            : 0;
          const activeZeroConfirmed = activePeriodObj
            ? activePeriodObj.periodSplits?.some(
                (ps) => ps.categoryId === cat.id && ps.isZeroConfirmed
              ) ?? false
            : false;
          const isActivePendingForCat =
            Boolean(activePeriodObj) &&
            activePeriodSum === 0 &&
            !activeZeroConfirmed;

          // Exclude the unbilled active period from the chart series if there are historical periods,
          // preventing the graph from crashing to 0 while waiting for the bill.
          const billedPeriodsForCat = chronologicalPeriods.filter((p) => {
            if (!p.isActive || chronologicalPeriods.length <= 1) return true;
            const sum = expenses
              .filter((e) => e.periodId === p.id && e.categoryId === cat.id)
              .reduce((a, b) => a + b.amount, 0);
            const zeroConf =
              p.periodSplits?.some(
                (ps) => ps.categoryId === cat.id && ps.isZeroConfirmed
              ) ?? false;
            return sum > 0 || zeroConf;
          });

          const effectiveCatPeriods =
            billedPeriodsForCat.length > 0
              ? billedPeriodsForCat
              : chronologicalPeriods;

          const catSeries = effectiveCatPeriods.map((p, idx) => {
            const catItems = expenses.filter(
              (e) => e.periodId === p.id && e.categoryId === cat.id
            );
            const sum = catItems.reduce((a, b) => a + b.amount, 0);
            const shortLabel =
              p.label.split(" ").slice(0, 2).join(" ") || `D${idx + 1}`;
            return {
              name: shortLabel,
              fullLabel: p.label,
              amount: Number(sum.toFixed(2)),
              count: catItems.length,
            };
          });

          const latestVal =
            catSeries.length > 0 ? catSeries[catSeries.length - 1].amount : 0;
          const prevVal =
            catSeries.length > 1 ? catSeries[catSeries.length - 2].amount : null;

          let diffPct: number | null = null;
          if (prevVal !== null && prevVal > 0) {
            diffPct = ((latestVal - prevVal) / prevVal) * 100;
          }

          const avgVal =
            catSeries.length > 0
              ? catSeries.reduce((a, b) => a + b.amount, 0) / catSeries.length
              : 0;

          return (
            <div
              key={cat.id}
              className="rounded-3xl border border-[#eecbad] bg-white p-5 shadow-sm transition hover:border-[#cd853f]/60 hover:shadow-premium"
            >
              {/* Card Header */}
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eecbad]/45 text-[#cd853f] border border-[#eecbad]">
                    <CategoryIcon
                      name={cat.name}
                      iconKey={cat.icon}
                      className="h-5 w-5"
                    />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-[#0f172a]">
                      {cat.name} — Aylık Değişim
                    </h4>
                    <p className="text-xs font-medium text-[#475569]">
                      Dönem Ortalaması:{" "}
                      <strong className="text-[#0f172a]">
                        {formatCurrencyTRY(avgVal)}
                      </strong>
                    </p>
                  </div>
                </div>

                {/* Trend & Pending Bill Badges */}
                <div className="flex flex-col items-end gap-1">
                  {isActivePendingForCat && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-[#eecbad]/60 px-2 py-0.5 text-[10px] font-extrabold text-[#0f172a] border border-[#cd853f]/40">
                      <Clock className="h-3 w-3 text-[#cd853f]" />
                      Aktif Ay: Fatura Bekleniyor
                    </span>
                  )}
                  {diffPct !== null ? (
                    <span
                      className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-extrabold ${
                        diffPct > 0.5
                          ? "bg-amber-100 text-amber-950"
                          : diffPct < -0.5
                          ? "bg-[#97ffff] text-[#0f172a]"
                          : "bg-[#eecbad]/50 text-[#0f172a]"
                      }`}
                    >
                      {diffPct > 0.5 ? (
                        <>
                          <TrendingUp className="h-3.5 w-3.5 text-[#cd853f]" />%
                          {Math.abs(diffPct).toFixed(0)} Artış
                        </>
                      ) : diffPct < -0.5 ? (
                        <>
                          <TrendingDown className="h-3.5 w-3.5 text-[#0f172a]" />%
                          {Math.abs(diffPct).toFixed(0)} Azalış
                        </>
                      ) : (
                        <>
                          <Minus className="h-3.5 w-3.5" /> %0 Değişim
                        </>
                      )}
                    </span>
                  ) : (
                    !isActivePendingForCat && (
                      <span className="rounded-lg bg-[#faf8f5] px-2.5 py-1 text-[11px] font-bold text-[#475569] border border-[#eecbad]">
                        Tek Dönem
                      </span>
                    )
                  )}
                </div>
              </div>

              {/* Dedicated Recharts Graph */}
              <div className="h-48 w-full rounded-2xl bg-[#faf8f5] p-3 border border-[#eecbad]/70">
                <ResponsiveContainer width="100%" height="100%">
                  {chartStyle === "area" ? (
                    <AreaChart
                      data={catSeries}
                      margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id={`grad-${cat.id}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#cd853f"
                            stopOpacity={0.35}
                          />
                          <stop
                            offset="95%"
                            stopColor="#eecbad"
                            stopOpacity={0.05}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#eecbad"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#475569", fontSize: 11, fontWeight: 600 }}
                        axisLine={{ stroke: "#eecbad" }}
                      />
                      <YAxis
                        tick={{ fill: "#475569", fontSize: 11, fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          borderColor: "#cd853f",
                          borderRadius: "12px",
                          color: "#0f172a",
                          fontSize: "12px",
                          fontWeight: 700,
                        }}
                        formatter={(val: number) => [
                          formatCurrencyTRY(val),
                          cat.name,
                        ]}
                        labelFormatter={(_, payload) =>
                          payload?.[0]?.payload?.fullLabel || ""
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="amount"
                        stroke="#cd853f"
                        strokeWidth={2.5}
                        fill={`url(#grad-${cat.id})`}
                        activeDot={{
                          r: 5,
                          fill: "#97ffff",
                          stroke: "#0f172a",
                          strokeWidth: 2,
                        }}
                      />
                    </AreaChart>
                  ) : (
                    <BarChart
                      data={catSeries}
                      margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#eecbad"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#475569", fontSize: 11, fontWeight: 600 }}
                        axisLine={{ stroke: "#eecbad" }}
                      />
                      <YAxis
                        tick={{ fill: "#475569", fontSize: 11, fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          borderColor: "#cd853f",
                          borderRadius: "12px",
                          color: "#0f172a",
                          fontSize: "12px",
                          fontWeight: 700,
                        }}
                        formatter={(val: number) => [
                          formatCurrencyTRY(val),
                          cat.name,
                        ]}
                        labelFormatter={(_, payload) =>
                          payload?.[0]?.payload?.fullLabel || ""
                        }
                      />
                      <Bar
                        dataKey="amount"
                        fill="#cd853f"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={42}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Period Mini Summary Strip */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-[#475569]">
                  Son Dönem ({catSeries[catSeries.length - 1]?.name || "-"}):
                </span>
                <span className="font-extrabold tabular-nums text-[#0f172a]">
                  {formatCurrencyTRY(latestVal)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
