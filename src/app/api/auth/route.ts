import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_DORM_CATEGORIES,
  DEFAULT_HOUSE_CATEGORIES,
  getActiveBillingPeriod,
} from "@/lib/billing-cycle";
import {
  ensureDefaultDemoRooms,
  generateUniqueRoomCode,
  pickAvatarColor,
  populateSampleDataForRoom,
} from "@/lib/demo-seed";
import {
  computeEqualPercentages,
  syncRoomEqualSplitsForActivePeriod,
} from "@/lib/split-calculator";

export const dynamic = "force-dynamic";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export async function GET() {
  try {
    await ensureDefaultDemoRooms();
    const cookieStore = cookies();
    const userToken = cookieStore.get("hm_user_token")?.value;
    const roomCode = cookieStore.get("hm_room_code")?.value;

    if (!userToken || !roomCode) {
      return NextResponse.json({ authenticated: false });
    }

    const member = await prisma.member.findUnique({
      where: { token: userToken },
      include: { room: true },
    });

    if (!member || member.room.code !== roomCode.toUpperCase()) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      member: {
        id: member.id,
        name: member.name,
        token: member.token,
        avatarColor: member.avatarColor,
      },
      room: {
        id: member.room.id,
        code: member.room.code,
        name: member.room.name,
        type: member.room.type,
        cycleDay: member.room.cycleDay,
      },
    });
  } catch (error) {
    console.error("Auth GET error:", error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDefaultDemoRooms();
    const body = await req.json();
    const action = body.action as "create" | "join" | "logout";

    if (action === "logout") {
      const res = NextResponse.json({ ok: true });
      res.cookies.delete("hm_user_token");
      res.cookies.delete("hm_room_code");
      return res;
    }

    const rawName = (body.userName || "").trim();
    if (!rawName || rawName.length < 2) {
      return NextResponse.json(
        { error: "Lütfen en az 2 karakterli geçerli bir isim girin." },
        { status: 400 }
      );
    }

    if (action === "create") {
      const roomType = body.roomType === "DORM" ? "DORM" : "HOUSE";
      const customRoomName = (body.roomName || "").trim();
      const cycleDay = Math.min(28, Math.max(1, Number(body.cycleDay) || 1));
      const withSampleData = Boolean(body.withSampleData);

      const code = await generateUniqueRoomCode();
      const defaultTitle =
        roomType === "DORM"
          ? `${rawName} & Arkadaşları Yurt Odası`
          : `${rawName} & Arkadaşları Evi`;

      const room = await prisma.room.create({
        data: {
          code,
          name: customRoomName || defaultTitle,
          type: roomType,
          cycleDay,
        },
      });

      const token = randomUUID();
      const member = await prisma.member.create({
        data: {
          roomId: room.id,
          name: rawName,
          token,
          avatarColor: pickAvatarColor(0),
        },
      });

      const defaultCats =
        roomType === "DORM" ? DEFAULT_DORM_CATEGORIES : DEFAULT_HOUSE_CATEGORIES;

      const createdCategories = [];
      for (const cat of defaultCats) {
        const created = await prisma.category.create({
          data: {
            roomId: room.id,
            name: cat.name,
            icon: cat.icon,
            isDefault: true,
            sortOrder: cat.sortOrder,
          },
        });
        createdCategories.push(created);
      }

      // Create active billing period
      const activePeriodMeta = getActiveBillingPeriod(new Date(), cycleDay);
      const activePeriod = await prisma.billingPeriod.create({
        data: {
          roomId: room.id,
          periodKey: activePeriodMeta.periodKey,
          label: activePeriodMeta.label,
          startDate: activePeriodMeta.startDate,
          endDate: activePeriodMeta.endDate,
          isActive: true,
          isFrozen: false,
        },
      });

      // Initialize 100% split for the creator until a 2nd roommate joins
      for (const cat of createdCategories) {
        await prisma.categorySplit.create({
          data: {
            categoryId: cat.id,
            memberId: member.id,
            percentage: 100,
          },
        });
        await prisma.periodCategorySplit.create({
          data: {
            periodId: activePeriod.id,
            categoryId: cat.id,
            memberId: member.id,
            percentage: 100,
          },
        });
      }

      if (withSampleData) {
        await populateSampleDataForRoom(room.id);
      }

      const response = NextResponse.json({
        ok: true,
        roomCode: room.code,
        userToken: member.token,
        member: {
          id: member.id,
          name: member.name,
          token: member.token,
          avatarColor: member.avatarColor,
        },
      });

      response.cookies.set("hm_user_token", member.token, {
        httpOnly: true,
        path: "/",
        maxAge: COOKIE_MAX_AGE,
        sameSite: "lax",
      });
      response.cookies.set("hm_room_code", room.code, {
        httpOnly: false,
        path: "/",
        maxAge: COOKIE_MAX_AGE,
        sameSite: "lax",
      });

      return response;
    }

    if (action === "join") {
      let rawCode = (body.roomCode || "").trim().toUpperCase();
      if (!rawCode) {
        return NextResponse.json(
          { error: "Lütfen 6 haneli oda kodunu girin (Örn: HM-4829)." },
          { status: 400 }
        );
      }
      if (!rawCode.startsWith("HM-") && rawCode.length === 4) {
        rawCode = `HM-${rawCode}`;
      }

      const room = await prisma.room.findUnique({
        where: { code: rawCode },
        include: {
          members: { orderBy: { joinedAt: "asc" } },
          categories: true,
        },
      });

      if (!room) {
        return NextResponse.json(
          { error: `"${rawCode}" kodlu bir ev veya yurt odası bulunamadı.` },
          { status: 404 }
        );
      }

      // Check if a member with the same name (case-insensitive) already exists in this room
      const existingMember = room.members.find(
        (m) => m.name.toLowerCase() === rawName.toLowerCase()
      );

      let activeMember = existingMember;

      if (!activeMember) {
        const token = randomUUID();
        activeMember = await prisma.member.create({
          data: {
            roomId: room.id,
            name: rawName,
            token,
            avatarColor: pickAvatarColor(room.members.length),
          },
        });

        // Re-equalize active period & default categories while preserving historical frozen periods!
        await syncRoomEqualSplitsForActivePeriod(room.id);
      }

      const response = NextResponse.json({
        ok: true,
        roomCode: room.code,
        userToken: activeMember.token,
        member: {
          id: activeMember.id,
          name: activeMember.name,
          token: activeMember.token,
          avatarColor: activeMember.avatarColor,
        },
      });

      response.cookies.set("hm_user_token", activeMember.token, {
        httpOnly: true,
        path: "/",
        maxAge: COOKIE_MAX_AGE,
        sameSite: "lax",
      });
      response.cookies.set("hm_room_code", room.code, {
        httpOnly: false,
        path: "/",
        maxAge: COOKIE_MAX_AGE,
        sameSite: "lax",
      });

      return response;
    }

    return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 });
  } catch (error) {
    console.error("Auth POST error:", error);
    const msg = error instanceof Error ? error.message : "Veritabani baglanti hatasi";
    return NextResponse.json(
      { error: `Oturum işlemi sırasında bir hata oluştu: ${msg}` },
      { status: 500 }
    );
  }
}
