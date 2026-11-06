import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeEqualPercentages } from "@/lib/split-calculator";

export const dynamic = "force-dynamic";

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
        categories: true,
        periods: true,
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Oda bulunamadı." }, { status: 404 });
    }

    const name = String(body.name || "").trim();
    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "Kategori adı en az 2 karakter olmalıdır." },
        { status: 400 }
      );
    }

    const existing = room.categories.find(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) {
      return NextResponse.json({ ok: true, category: existing, existed: true });
    }

    const category = await prisma.category.create({
      data: {
        roomId: room.id,
        name,
        icon: body.icon || "Sparkles",
        isDefault: false,
        sortOrder: room.categories.length + 1,
      },
    });

    const equalMap = computeEqualPercentages(room.members.map((m) => m.id));
    for (const member of room.members) {
      const pct = equalMap[member.id] ?? 0;
      await prisma.categorySplit.create({
        data: {
          categoryId: category.id,
          memberId: member.id,
          percentage: pct,
        },
      });

      for (const period of room.periods) {
        await prisma.periodCategorySplit.upsert({
          where: {
            periodId_categoryId_memberId: {
              periodId: period.id,
              categoryId: category.id,
              memberId: member.id,
            },
          },
          update: { percentage: pct },
          create: {
            periodId: period.id,
            categoryId: category.id,
            memberId: member.id,
            percentage: pct,
          },
        });
      }
    }

    return NextResponse.json({ ok: true, category });
  } catch (error) {
    console.error("Category POST error:", error);
    return NextResponse.json(
      { error: "Kategori eklenirken hata oluştu." },
      { status: 500 }
    );
  }
}

/**
 * Updates Split Ratios:
 * - Can update a single category's split percentages, OR apply a global split across all categories.
 * - Can also reset a category back to automatic equal split (resetToEqual: true).
 * - Updates the active period (or specified periodId) while keeping other historical periods untouched.
 */
export async function PUT(
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
        categories: true,
        periods: true,
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Oda bulunamadı." }, { status: 404 });
    }

    const applyToAll = Boolean(body.applyToAll);
    const resetToEqual = Boolean(body.resetToEqual);
    const targetCategoryId = body.categoryId ? String(body.categoryId) : "";
    const targetPeriodId = body.periodId
      ? String(body.periodId)
      : room.periods.find((p) => p.isActive)?.id;

    const targetCategories = applyToAll
      ? room.categories
      : room.categories.filter((c) => c.id === targetCategoryId);

    if (targetCategories.length === 0) {
      return NextResponse.json(
        { error: "Güncellenecek gider kalemi bulunamadı." },
        { status: 404 }
      );
    }

    let percentageMap: Record<string, number> = {};

    if (resetToEqual) {
      percentageMap = computeEqualPercentages(room.members.map((m) => m.id));
    } else {
      const splitsInput = body.splits as Array<{
        memberId: string;
        percentage: number;
      }>;
      if (!Array.isArray(splitsInput) || splitsInput.length === 0) {
        return NextResponse.json(
          { error: "Geçersiz bölüşüm oranı verisi." },
          { status: 400 }
        );
      }

      const totalPct = splitsInput.reduce(
        (acc, item) => acc + Number(item.percentage || 0),
        0
      );

      if (Math.abs(totalPct - 100) > 0.5) {
        return NextResponse.json(
          {
            error: `Bölüşüm oranlarının toplamı %100 olmalıdır (Şu an: %${totalPct.toFixed(
              1
            )}).`,
          },
          { status: 400 }
        );
      }

      for (const item of splitsInput) {
        percentageMap[item.memberId] = Number(
          Number(item.percentage || 0).toFixed(1)
        );
      }
    }

    for (const cat of targetCategories) {
      await prisma.category.update({
        where: { id: cat.id },
        data: { hasCustomSplit: !resetToEqual },
      });

      for (const member of room.members) {
        const pct = percentageMap[member.id] ?? 0;
        await prisma.categorySplit.upsert({
          where: {
            categoryId_memberId: {
              categoryId: cat.id,
              memberId: member.id,
            },
          },
          update: { percentage: pct },
          create: {
            categoryId: cat.id,
            memberId: member.id,
            percentage: pct,
          },
        });

        if (targetPeriodId) {
          await prisma.periodCategorySplit.upsert({
            where: {
              periodId_categoryId_memberId: {
                periodId: targetPeriodId,
                categoryId: cat.id,
                memberId: member.id,
              },
            },
            update: { percentage: pct },
            create: {
              periodId: targetPeriodId,
              categoryId: cat.id,
              memberId: member.id,
              percentage: pct,
            },
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Category PUT error:", error);
    return NextResponse.json(
      { error: "Bölüşüm oranları güncellenirken hata oluştu." },
      { status: 500 }
    );
  }
}

/**
 * Toggles "Fatura Bekleniyor" (isZeroConfirmed = false) vs "Bu Dönem Gider Yok / ₺0 Onaylı" (isZeroConfirmed = true)
 * for a category in a specific period so Recharts doesn't plunge to 0 when a bill hasn't arrived yet.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code.toUpperCase();
    const body = await req.json();
    const periodId = String(body.periodId || "");
    const categoryId = String(body.categoryId || "");
    const isZeroConfirmed = Boolean(body.isZeroConfirmed);

    if (!periodId || !categoryId) {
      return NextResponse.json(
        { error: "Dönem ve kategori bilgisi gerekli." },
        { status: 400 }
      );
    }

    const room = await prisma.room.findUnique({
      where: { code },
      include: { members: true, categories: { include: { splits: true } } },
    });

    if (!room) {
      return NextResponse.json({ error: "Oda bulunamadı." }, { status: 404 });
    }

    const equalMap = computeEqualPercentages(room.members.map((m) => m.id));
    const cat = room.categories.find((c) => c.id === categoryId);

    for (const member of room.members) {
      const catSplit = cat?.splits.find((s) => s.memberId === member.id);
      const pct = catSplit ? catSplit.percentage : equalMap[member.id] ?? 0;

      await prisma.periodCategorySplit.upsert({
        where: {
          periodId_categoryId_memberId: {
            periodId,
            categoryId,
            memberId: member.id,
          },
        },
        update: { isZeroConfirmed },
        create: {
          periodId,
          categoryId,
          memberId: member.id,
          percentage: pct,
          isZeroConfirmed,
        },
      });
    }

    return NextResponse.json({ ok: true, isZeroConfirmed });
  } catch (error) {
    console.error("Category PATCH error:", error);
    return NextResponse.json(
      { error: "Fatura durumu güncellenirken hata oluştu." },
      { status: 500 }
    );
  }
}
