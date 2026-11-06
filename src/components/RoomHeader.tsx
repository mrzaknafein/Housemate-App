"use client";

import React, { useState } from "react";
import {
  Building2,
  Check,
  Copy,
  Home,
  LogOut,
  Share2,
  SlidersHorizontal,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { RoomData } from "@/types/housemate";

interface RoomHeaderProps {
  room: RoomData;
  currentMemberName: string;
  onOpenSplitModal: () => void;
  onOpenCycleModal: () => void;
  onPopulateDemoData: () => void;
  onLogout: () => void;
  isSyncing: boolean;
}

export function RoomHeader({
  room,
  currentMemberName,
  onOpenSplitModal,
  onOpenCycleModal,
  onPopulateDemoData,
  onLogout,
  isSyncing,
}: RoomHeaderProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  function handleCopyCode() {
    navigator.clipboard.writeText(room.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  function handleCopyInviteLink() {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const inviteUrl = `${origin}/?join=${room.code}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  const defaultEqualPct =
    room.members.length > 0 ? (100 / room.members.length).toFixed(1) : "100";

  return (
    <header className="rounded-3xl border border-[#eecbad] bg-white p-5 shadow-premium md:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Room Title, Type Badge, Room Code (#97ffff with strict #0f172a contrast) */}
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#cd853f] text-white shadow-sm">
            {room.type === "DORM" ? (
              <Building2 className="h-7 w-7" />
            ) : (
              <Home className="h-7 w-7" />
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-[#eecbad] px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider text-[#0f172a]">
                {room.type === "DORM" ? "Yurt Modülü" : "Ev Modülü"}
              </span>

              {/* Room Code Badge using #97ffff and #0f172a */}
              <button
                type="button"
                onClick={handleCopyCode}
                title="Oda kodunu kopyalamak için tıklayın"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#0f172a]/15 bg-[#97ffff] px-3 py-1 font-mono text-xs font-extrabold text-[#0f172a] transition hover:brightness-95"
              >
                <span>ODA KODU: {room.code}</span>
                {copiedCode ? (
                  <Check className="h-3.5 w-3.5 text-[#0f172a]" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-[#0f172a]" />
                )}
              </button>

              {/* Shareable Invite Link Button */}
              <button
                type="button"
                onClick={handleCopyInviteLink}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#eecbad] bg-[#faf8f5] px-2.5 py-1 text-xs font-bold text-[#1e293b] transition hover:border-[#cd853f] hover:bg-[#eecbad]/30"
              >
                <Share2 className="h-3.5 w-3.5 text-[#cd853f]" />
                <span>
                  {copiedLink ? "Davet Linki Kopyalandı!" : "Davet Linki Paylaş"}
                </span>
              </button>

              {/* Real-time Sync Status Pill */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#faf8f5] px-2.5 py-0.5 text-[11px] font-semibold text-[#475569] border border-[#eecbad]">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isSyncing ? "animate-ping bg-[#cd853f]" : "bg-emerald-500"
                  }`}
                />
                Canlı Senkron
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#0f172a] md:text-3xl">
              {room.name}
            </h1>

            <p className="mt-1 text-xs font-medium text-[#475569]">
              Hoş geldin,{" "}
              <strong className="font-bold text-[#0f172a]">
                {currentMemberName}
              </strong>{" "}
              • Varsayılan bölüşüm oranı ({room.members.length} kişi):{" "}
              <strong className="text-[#cd853f]">
                kişi başı %{defaultEqualPct.replace(".0", "")}
              </strong>{" "}
              • Döngü Sıfırlama: Her ayın{" "}
              <strong className="text-[#0f172a]">{room.cycleDay}. günü</strong>
            </p>
          </div>
        </div>

        {/* Right: Roommates Avatars & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Roommates list */}
          <div className="flex items-center gap-2 rounded-2xl border border-[#eecbad] bg-[#faf8f5] px-3.5 py-2">
            <Users className="h-4 w-4 text-[#cd853f]" />
            <div className="flex flex-wrap items-center gap-1.5">
              {room.members.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white px-2.5 py-1 text-xs font-bold text-[#0f172a] border border-[#eecbad] shadow-sm"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: m.avatarColor || "#cd853f" }}
                  />
                  {m.name}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={handleCopyInviteLink}
              title="Arkadaşını davet et"
              className="ml-1 flex h-7 w-7 items-center justify-center rounded-lg bg-[#eecbad]/60 text-[#0f172a] transition hover:bg-[#cd853f] hover:text-white"
            >
              <UserPlus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Split Ratio Button */}
          <button
            type="button"
            onClick={onOpenSplitModal}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#eecbad] bg-[#eecbad]/35 px-3.5 py-2.5 text-xs font-extrabold text-[#0f172a] transition hover:border-[#cd853f] hover:bg-[#eecbad]/60"
          >
            <SlidersHorizontal className="h-4 w-4 text-[#cd853f]" />
            <span>Bölüşüm Oranları (%)</span>
          </button>

          {/* Cycle Day Config Button */}
          <button
            type="button"
            onClick={onOpenCycleModal}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#0f172a]/15 bg-[#97ffff] px-3.5 py-2.5 text-xs font-extrabold text-[#0f172a] transition hover:brightness-95"
          >
            <span>Ay Döngüsü: {room.cycleDay}. Gün</span>
          </button>

          {/* Populate Sample Data Button */}
          <button
            type="button"
            onClick={onPopulateDemoData}
            title="4 aylık örnek geçmiş veri yükle veya sıfırla"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#eecbad] bg-white px-3 py-2.5 text-xs font-bold text-[#475569] transition hover:border-[#cd853f] hover:text-[#0f172a]"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#cd853f]" />
            <span className="hidden sm:inline">Örnek Veri</span>
          </button>

          {/* Switch Room / Logout */}
          <button
            type="button"
            onClick={onLogout}
            title="Başka odaya geç veya çıkış yap"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#eecbad] bg-white px-3 py-2.5 text-xs font-bold text-[#475569] transition hover:border-red-300 hover:bg-red-50 hover:text-red-800"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Oda Değiştir</span>
          </button>
        </div>
      </div>
    </header>
  );
}
