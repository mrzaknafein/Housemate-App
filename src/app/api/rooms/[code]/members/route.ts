import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { pickAvatarColor } from "@/lib/demo-seed";
import { syncRoomEqualSplitsForActivePeriod } from "@/lib/split-calculator";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code.toUpperCase();
    const body = await req.json();
    const rawName = String(body.name || "").trim();

    if (!rawName || rawName.length < 2) {
      return NextResponse.json(
        { error: "Lütfen en az 2 karakterli bir isim girin." },
        { status: 400 }
      );
    }

    const room = await prisma.room.findUnique({
      where: { code },
      include: { members: { orderBy: { joinedAt: "asc" } } },
    });

    if (!room) {
      return NextResponse.json({ error: "Oda bulunamadı." }, { status: 404 });
    }

    const exists = room.members.some(
      (m) => m.name.toLowerCase() === rawName.toLowerCase()
    );
    if (exists) {
      return NextResponse.json(
        { error: `"${rawName}" isimli bir kişi zaten odada kayıtlı.` },
        { status: 400 }
      );
    }

    const newMember = await prisma.member.create({
      data: {
        roomId: room.id,
        name: rawName,
        token: randomUUID(),
        avatarColor: pickAvatarColor(room.members.length),
      },
    });

    // Re-equalize active period & default categories while keeping frozen historical periods intact!
    await syncRoomEqualSplitsForActivePeriod(room.id);

    return NextResponse.json({ ok: true, member: newMember });
  } catch (error) {
    console.error("Member POST error:", error);
    return NextResponse.json(
      { error: "Ev/Yurt arkadaşı eklenirken hata oluştu." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code.toUpperCase();
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("id");

    if (!memberId) {
      return NextResponse.json({ error: "Üye ID gerekli." }, { status: 400 });
    }

    const room = await prisma.room.findUnique({
      where: { code },
      include: { members: true },
    });

    if (!room) {
      return NextResponse.json({ error: "Oda bulunamadı." }, { status: 404 });
    }

    if (room.members.length <= 1) {
      return NextResponse.json(
        { error: "Odada en az 1 kişi kalmalıdır." },
        { status: 400 }
      );
    }

    await prisma.member.deleteMany({
      where: {
        id: memberId,
        roomId: room.id,
      },
    });

    await syncRoomEqualSplitsForActivePeriod(room.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Member DELETE error:", error);
    return NextResponse.json(
      { error: "Üye silinirken hata oluştu." },
      { status: 500 }
    );
  }
}
