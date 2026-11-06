import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildBillingPeriod,
  getActiveBillingPeriod,
  getSelectableHistoricalPeriods,
} from "@/lib/billing-cycle";
import { ensureDefaultDemoRooms } from "@/lib/demo-seed";
import { computeEqualPercentages } from "@/lib/split-calculator";

export const dynamic = "force-dynamic";

async function normalizeRoomPeriods(roomId: string, cycleDay: number) {
  const activeComputed = getActiveBillingPeriod(new Date(), cycleDay);
  const periods = await prisma.billingPeriod.findMany({
    where: { roomId },
    orderBy: { periodKey: "asc" },
  });

  // 1. Ensure every period's label/startDate/endDate matches its periodKey + room.cycleDay
  // and ensure ONLY the period matching activeComputed.periodKey has isActive = true
  const seenLabels = new Map<string, string>(); // label -> periodId

  for (const p of periods) {
    const [yStr, mStr] = p.periodKey.split("-");
    const year = parseInt(yStr, 10);
    const monthIndex = parseInt(mStr, 10) - 1;
    const expected = buildBillingPeriod(year, monthIndex, cycleDay);
    const shouldBeActive = p.periodKey === activeComputed.periodKey;

    if (
      p.label !== expected.label ||
      p.isActive !== shouldBeActive ||
      p.isFrozen === shouldBeActive
    ) {
      await prisma.billingPeriod.update({
        where: { id: p.id },
        data: {
          label: expected.label,
          startDate: expected.startDate,
          endDate: expected.endDate,
          isActive: shouldBeActive,
          isFrozen: !shouldBeActive,
        },
      });
    }

    // Deduplicate if two different periodKeys accidentally got the same label
    if (seenLabels.has(expected.label)) {
      const targetId = seenLabels.get(expected.label)!;
      await prisma.expense.updateMany({
        where: { periodId: p.id },
        data: { periodId: targetId },
      });
      await prisma.billingPeriod.delete({ where: { id: p.id } });
    } else {
      seenLabels.set(expected.label, p.id);
    }
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code.toUpperCase();
    if (code === "HM-DEMO" || code === "HM-YURT") {
      await ensureDefaultDemoRooms();
    }

    const initialRoom = await prisma.room.findUnique({
      where: { code },
      include: {
        members: { orderBy: { joinedAt: "asc" } },
        categories: {
          orderBy: { sortOrder: "asc" },
          include: { splits: true },
        },
        periods: true,
      },
    });

    if (!initialRoom) {
      return NextResponse.json({ error: "Oda bulunamadı." }, { status: 404 });
    }

    // Ensure the current active period according to cycleDay exists in DB
    const activeComputed = getActiveBillingPeriod(
      new Date(),
      initialRoom.cycleDay
    );
    const hasCurrentActivePeriod = initialRoom.periods.some(
      (p) => p.periodKey === activeComputed.periodKey
    );

    if (!hasCurrentActivePeriod) {
      await prisma.billingPeriod.updateMany({
        where: { roomId: initialRoom.id, isActive: true },
        data: { isActive: false, isFrozen: true },
      });

      const createdPeriod = await prisma.billingPeriod.create({
        data: {
          roomId: initialRoom.id,
          periodKey: activeComputed.periodKey,
          label: activeComputed.label,
          startDate: activeComputed.startDate,
          endDate: activeComputed.endDate,
          isActive: true,
          isFrozen: false,
        },
      });

      const equalMap = computeEqualPercentages(
        initialRoom.members.map((m) => m.id)
      );
      for (const cat of initialRoom.categories) {
        for (const member of initialRoom.members) {
          const catSplit = cat.splits.find((s) => s.memberId === member.id);
          const pct = catSplit ? catSplit.percentage : equalMap[member.id] ?? 0;
          await prisma.periodCategorySplit.create({
            data: {
              periodId: createdPeriod.id,
              categoryId: cat.id,
              memberId: member.id,
              percentage: pct,
            },
          });
        }
      }
    }

    // Normalize all period labels & active flags so active period never appears twice or as past
    await normalizeRoomPeriods(initialRoom.id, initialRoom.cycleDay);

    const room = await prisma.room.findUnique({
      where: { id: initialRoom.id },
      include: {
        members: { orderBy: { joinedAt: "asc" } },
        categories: {
          orderBy: { sortOrder: "asc" },
          include: { splits: true },
        },
        periods: {
          orderBy: { periodKey: "asc" },
          include: { periodSplits: true },
        },
        expenses: {
          orderBy: { expenseDate: "desc" },
          include: { paidBy: true, category: true, period: true },
        },
      },
    });

    return NextResponse.json({
      room,
      availableHistoricalTemplates: getSelectableHistoricalPeriods(
        initialRoom.cycleDay,
        12
      ),
    });
  } catch (error) {
    console.error("Room GET error:", error);
    return NextResponse.json(
      { error: "Oda verileri alınırken hata oluştu." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code.toUpperCase();
    const body = await req.json();

    const room = await prisma.room.findUnique({
      where: { code },
      include: { periods: true },
    });

    if (!room) {
      return NextResponse.json({ error: "Oda bulunamadı." }, { status: 404 });
    }

    const updateData: { name?: string; cycleDay?: number } = {};
    if (typeof body.name === "string" && body.name.trim().length >= 2) {
      updateData.name = body.name.trim();
    }

    if (typeof body.cycleDay === "number") {
      const safeDay = Math.min(28, Math.max(1, Math.floor(body.cycleDay)));
      updateData.cycleDay = safeDay;
    }

    const updatedRoom = await prisma.room.update({
      where: { id: room.id },
      data: updateData,
    });

    if (typeof updateData.cycleDay === "number") {
      await normalizeRoomPeriods(room.id, updateData.cycleDay);
    }

    return NextResponse.json({ ok: true, room: updatedRoom });
  } catch (error) {
    console.error("Room PATCH error:", error);
    return NextResponse.json(
      { error: "Oda ayarları güncellenemedi." },
      { status: 500 }
    );
  }
}
