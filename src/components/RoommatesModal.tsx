"use client";

import React, { useState } from "react";
import { Plus, Trash2, UserPlus, Users, X } from "lucide-react";
import { RoomMember } from "@/types/housemate";

interface RoommatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  members: RoomMember[];
  onAddMember: (name: string) => Promise<void>;
  onRemoveMember: (memberId: string) => Promise<void>;
}

export function RoommatesModal({
  isOpen,
  onClose,
  roomCode,
  members,
  onAddMember,
  onRemoveMember,
}: RoommatesModalProps) {
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newName.trim().length < 2) {
      setError("Lütfen en az 2 karakterli bir isim girin.");
      return;
    }
    setSubmitting(true);
    try {
      await onAddMember(newName.trim());
      setNewName("");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Üye eklenirken hata oluştu."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(memberId: string) {
    if (members.length <= 1) {
      setError("Odada en az 1 kişi bulunmalıdır.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onRemoveMember(memberId);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Üye silinirken hata oluştu."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const equalSharePct = (100 / Math.max(1, members.length))
    .toFixed(1)
    .replace(".0", "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/45 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-lg rounded-3xl border border-[#eecbad] bg-white p-6 shadow-premium">
        <div className="flex items-center justify-between border-b border-[#eecbad] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#97ffff] text-[#0f172a]">
              <Users className="h-5 w-5 text-[#0f172a]" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[#0f172a]">
                Ev / Yurt Arkadaşları Yönetimi
              </h3>
              <p className="text-xs text-[#475569]">
                Yeni kişi eklendiğinde aktif dönem eşit oranları otomatik %
                {equalSharePct} olarak güncellenir (geçmiş aylar bozulmaz).
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

        {/* Quick Add Roommate Form */}
        <form onSubmit={handleAdd} className="mt-5 flex gap-2">
          <input
            type="text"
            placeholder="Yeni ev/oda arkadaşı adı (Örn: Can)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 rounded-xl border border-[#eecbad] bg-[#faf8f5] px-4 py-2.5 text-sm font-bold text-[#0f172a] placeholder-[#475569]/60 outline-none focus:border-[#cd853f] focus:bg-white"
          />
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#cd853f] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#b57232] disabled:opacity-60"
          >
            <UserPlus className="h-4 w-4" />
            <span>Kişi Ekle</span>
          </button>
        </form>

        {/* Current Members List */}
        <div className="mt-5 space-y-2">
          <span className="block text-xs font-bold uppercase tracking-wider text-[#475569]">
            Kayıtlı Kişiler ({members.length} Kişi • Varsayılan Oran: %{equalSharePct})
          </span>
          <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-2xl border border-[#eecbad] bg-[#faf8f5] px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-3.5 w-3.5 rounded-full"
                    style={{ backgroundColor: member.avatarColor || "#cd853f" }}
                  />
                  <div>
                    <p className="text-sm font-extrabold text-[#0f172a]">
                      {member.name}
                    </p>
                    <p className="text-[11px] font-medium text-[#475569]">
                      Oda Kodu ({roomCode}) ile doğrudan giriş yapabilir
                    </p>
                  </div>
                </div>

                {members.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemove(member.id)}
                    disabled={submitting}
                    title="Bu kişiyi odadan çıkar"
                    className="rounded-xl p-2 text-[#475569] transition hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-[#97ffff] p-3.5 text-xs font-semibold text-[#0f172a]">
          💡 Arkadaşınız kendi telefonundan veya bilgisayarından girerken{" "}
          <strong>Mevcut Ortama Katıl</strong> sekmesinde aynı ismi ve{" "}
          <strong className="font-mono">{roomCode}</strong> kodunu yazarak
          doğrudan kendi profiline bağlanabilir.
        </div>
      </div>
    </div>
  );
}
