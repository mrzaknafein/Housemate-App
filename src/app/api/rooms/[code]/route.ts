import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getActiveBillingPeriod,
  getSelectableHistoricalPeriods,
} from "@/lib/billing-cycle";
import { ensureDefaultDemoRooms } from "@/lib/demo-seed";
import { computeEqualPercentages } from "@/lib/split-calculator";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code.toUpperCase();
    if (code === "HM-DEMO" || code === "HM-YURT") {
      await ensureDefaultDemoRooms();
    }

    const room = await prisma.room.findUnique({
      where: { code },
      include: {
        members: { orderBy: { joinedAt: "asc" } },
        categories: {
          orderBy: { sortOrder: "asc" },
          include: {
            splits: true,
          },
        },
        periods: {
          orderBy: { periodKey: "asc" },
          include: {
            periodSplits: true,
          },
        },
        expenses: {
          orderBy: { expenseDate: "desc" },
          include: {
            paidBy: true,
            category: true,
            period: true,
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Oda bulunamadı." }, { status: 404 });
    }

    // Ensure the current active period according to cycleDay exists in DB
    const activeComputed = getActiveBillingPeriod(new Date(), room.cycleDay);
    const hasCurrentActivePeriod = room.periods.some(
      (p) => p.periodKey === activeComputed.periodKey
    );

    if (!hasCurrentActivePeriod) {
      // Freeze previous active periods
      await prisma.billingPeriod.updateMany({
        where: { roomId: room.id, isActive: true },
        data: { isActive: false, isFrozen: true },
      });

      const createdPeriod = await prisma.billingPeriod.create({
        data: {
          roomId: room.id,
          periodKey: activeComputed.periodKey,
          label: activeComputed.label,
          startDate: activeComputed.startDate,
          endDate: activeComputed.endDate,
          isActive: true,
          isFrozen: false,
        },
      });

      // Copy current category splits into the new active period snapshot
      const equalMap = computeEqualPercentages(room.members.map((m) => m.id));
      for (const cat of room.categories) {
        for (const member of room.members) {
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

      // Reload room periods after auto-creating active period
      const refreshed = await prisma.room.findUnique({
        where: { id: room.id },
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

      if (refreshed) {
        return NextResponse.json({
          room: refreshed,
          availableHistoricalTemplates: getSelectableHistoricalPeriods(
            refreshed.cycleDay,
            12
          ),
        });
      }
    }

    return NextResponse.json({
      room,
      availableHistoricalTemplates: getSelectableHistoricalPeriods(
        room.cycleDay,
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

    // If cycleDay changed, update the label/dates of the currently active period
    if (typeof updateData.cycleDay === "number") {
      const activePeriod = room.periods.find((p) => p.isActive);
      const computed = getActiveBillingPeriod(new Date(), updateData.cycleDay);
      if (activePeriod) {
        await prisma.billingPeriod.update({
          where: { id: activePeriod.id },
          data: {
            label: computed.label,
            startDate: computed.startDate,
            endDate: computed.endDate,
          },
        });
      }
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
