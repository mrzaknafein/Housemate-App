import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { populateSampleDataForRoom } from "@/lib/demo-seed";
import { getActiveBillingPeriod } from "@/lib/billing-cycle";
import { computeEqualPercentages } from "@/lib/split-calculator";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code.toUpperCase();
    const body = await req.json();
    const mode = body.mode as "populate" | "clear";

    const room = await prisma.room.findUnique({
      where: { code },
      include: {
        members: true,
        categories: true,
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Oda bulunamadı." }, { status: 404 });
    }

    if (mode === "clear") {
      await prisma.expense.deleteMany({ where: { roomId: room.id } });
      await prisma.periodCategorySplit.deleteMany({
        where: { period: { roomId: room.id } },
      });
      await prisma.billingPeriod.deleteMany({ where: { roomId: room.id } });

      const activeMeta = getActiveBillingPeriod(new Date(), room.cycleDay);
      const activePeriod = await prisma.billingPeriod.create({
        data: {
          roomId: room.id,
          periodKey: activeMeta.periodKey,
          label: activeMeta.label,
          startDate: activeMeta.startDate,
          endDate: activeMeta.endDate,
          isActive: true,
          isFrozen: false,
        },
      });

      const equalMap = computeEqualPercentages(room.members.map((m) => m.id));
      for (const cat of room.categories) {
        for (const m of room.members) {
          await prisma.periodCategorySplit.create({
            data: {
              periodId: activePeriod.id,
              categoryId: cat.id,
              memberId: m.id,
              percentage: equalMap[m.id] ?? 0,
            },
          });
        }
      }

      return NextResponse.json({ ok: true, cleared: true });
    }

    await populateSampleDataForRoom(room.id);
    return NextResponse.json({ ok: true, populated: true });
  } catch (error) {
    console.error("Room seed POST error:", error);
    return NextResponse.json(
      { error: "Örnek veri işlemi başarısız oldu." },
      { status: 500 }
    );
  }
}
