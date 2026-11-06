import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildBillingPeriod } from "@/lib/billing-cycle";
import { computeEqualPercentages } from "@/lib/split-calculator";

export const dynamic = "force-dynamic";

/**
 * Allows users to manually create or activate a historical period (past month/cycle)
 * so they can enter historical bills & expenses even on a brand-new session.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code.toUpperCase();
    const body = await req.json();

    const room = await prisma.room.findUnique({
      where: { code },
      include: {
        members: { orderBy: { joinedAt: "asc" } },
        categories: { include: { splits: true } },
        periods: true,
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Oda bulunamadı." }, { status: 404 });
    }

    let year: number;
    let monthIndex: number;

    if (body.periodKey && typeof body.periodKey === "string") {
      const [yStr, mStr] = body.periodKey.split("-");
      year = parseInt(yStr, 10);
      monthIndex = parseInt(mStr, 10) - 1;
    } else {
      year = Number(body.year);
      monthIndex = Number(body.monthIndex); // 0-11
    }

    if (
      Number.isNaN(year) ||
      Number.isNaN(monthIndex) ||
      year < 2020 ||
      year > 2035 ||
      monthIndex < 0 ||
      monthIndex > 11
    ) {
      return NextResponse.json(
        { error: "Geçersiz yıl veya ay seçimi." },
        { status: 400 }
      );
    }

    const computed = buildBillingPeriod(year, monthIndex, room.cycleDay);
    const existing = room.periods.find(
      (p) => p.periodKey === computed.periodKey
    );

    if (existing) {
      return NextResponse.json({
        ok: true,
        period: existing,
        alreadyExists: true,
      });
    }

    const createdPeriod = await prisma.billingPeriod.create({
      data: {
        roomId: room.id,
        periodKey: computed.periodKey,
        label: body.customLabel ? String(body.customLabel).trim() : computed.label,
        startDate: computed.startDate,
        endDate: computed.endDate,
        isActive: false,
        isFrozen: true,
      },
    });

    // Initialize split snapshots for this historical period
    const equalMap = computeEqualPercentages(room.members.map((m) => m.id));
    for (const cat of room.categories) {
      for (const member of room.members) {
        const splitFound = cat.splits.find((s) => s.memberId === member.id);
        const pct = splitFound ? splitFound.percentage : equalMap[member.id] ?? 0;
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

    return NextResponse.json({ ok: true, period: createdPeriod });
  } catch (error) {
    console.error("Period POST error:", error);
    return NextResponse.json(
      { error: "Geçmiş dönem oluşturulurken hata oluştu." },
      { status: 500 }
    );
  }
}
