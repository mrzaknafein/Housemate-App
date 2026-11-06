import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildBillingPeriod } from "@/lib/billing-cycle";
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
        categories: { include: { splits: true } },
        periods: true,
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Oda bulunamadı." }, { status: 404 });
    }

    const amount = Number(body.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Lütfen 0'dan büyük geçerli bir tutar girin." },
        { status: 400 }
      );
    }

    const paidById = String(body.paidById || "");
    const memberExists = room.members.some((m) => m.id === paidById);
    if (!memberExists) {
      return NextResponse.json(
        { error: "Lütfen ödemeyi yapan ev/oda arkadaşını seçin." },
        { status: 400 }
      );
    }

    // Resolve Category (either existing categoryId OR create/aggregate by customCategoryName)
    let categoryId = body.categoryId ? String(body.categoryId) : "";
    const customCategoryName = String(body.customCategoryName || "").trim();

    if (!categoryId && customCategoryName) {
      const existingCategory = room.categories.find(
        (c) => c.name.toLowerCase() === customCategoryName.toLowerCase()
      );

      if (existingCategory) {
        categoryId = existingCategory.id;
      } else {
        const createdCategory = await prisma.category.create({
          data: {
            roomId: room.id,
            name: customCategoryName,
            icon: body.icon || "Sparkles",
            isDefault: false,
            sortOrder: room.categories.length + 1,
          },
        });
        categoryId = createdCategory.id;

        const equalMap = computeEqualPercentages(room.members.map((m) => m.id));
        for (const m of room.members) {
          const pct = equalMap[m.id] ?? 0;
          await prisma.categorySplit.create({
            data: {
              categoryId: createdCategory.id,
              memberId: m.id,
              percentage: pct,
            },
          });

          for (const p of room.periods) {
            await prisma.periodCategorySplit.upsert({
              where: {
                periodId_categoryId_memberId: {
                  periodId: p.id,
                  categoryId: createdCategory.id,
                  memberId: m.id,
                },
              },
              update: { percentage: pct },
              create: {
                periodId: p.id,
                categoryId: createdCategory.id,
                memberId: m.id,
                percentage: pct,
              },
            });
          }
        }
      }
    }

    if (!categoryId) {
      return NextResponse.json(
        { error: "Lütfen bir gider kalemi seçin veya yeni bir gider adı yazın." },
        { status: 400 }
      );
    }

    // Resolve Period (existing periodId OR historical periodKey like "2026-08")
    let periodId = body.periodId ? String(body.periodId) : "";
    const targetPeriodKey = String(body.periodKey || "").trim();

    if (!periodId && targetPeriodKey) {
      const existingPeriod = room.periods.find(
        (p) => p.periodKey === targetPeriodKey
      );
      if (existingPeriod) {
        periodId = existingPeriod.id;
      } else {
        const [yearStr, monthStr] = targetPeriodKey.split("-");
        const year = parseInt(yearStr, 10);
        const monthIndex = parseInt(monthStr, 10) - 1;
        const computed = buildBillingPeriod(year, monthIndex, room.cycleDay);

        const newPeriod = await prisma.billingPeriod.create({
          data: {
            roomId: room.id,
            periodKey: computed.periodKey,
            label: computed.label,
            startDate: computed.startDate,
            endDate: computed.endDate,
            isActive: false,
            isFrozen: true,
          },
        });
        periodId = newPeriod.id;

        const equalMap = computeEqualPercentages(room.members.map((m) => m.id));
        const allCategories = await prisma.category.findMany({
          where: { roomId: room.id },
          include: { splits: true },
        });
        for (const cat of allCategories) {
          for (const m of room.members) {
            const found = cat.splits.find((s) => s.memberId === m.id);
            const pct = found ? found.percentage : equalMap[m.id] ?? 0;
            await prisma.periodCategorySplit.create({
              data: {
                periodId: newPeriod.id,
                categoryId: cat.id,
                memberId: m.id,
                percentage: pct,
              },
            });
          }
        }
      }
    }

    if (!periodId) {
      const activePeriod = room.periods.find((p) => p.isActive) || room.periods[0];
      if (!activePeriod) {
        return NextResponse.json(
          { error: "Aktif dönem bulunamadı." },
          { status: 400 }
        );
      }
      periodId = activePeriod.id;
    }

    const selectedCategory = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    const title =
      String(body.title || "").trim() ||
      `${selectedCategory?.name || "Gider"} Ödemesi`;

    const expense = await prisma.expense.create({
      data: {
        roomId: room.id,
        periodId,
        categoryId,
        paidById,
        amount,
        title,
        expenseDate: body.expenseDate ? new Date(body.expenseDate) : new Date(),
      },
      include: {
        paidBy: true,
        category: true,
        period: true,
      },
    });

    return NextResponse.json({ ok: true, expense });
  } catch (error) {
    console.error("Expense POST error:", error);
    return NextResponse.json(
      { error: "Gider kaydedilirken bir hata oluştu." },
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
    const expenseId = String(body.id || "");
    if (!expenseId) {
      return NextResponse.json({ error: "Gider ID gerekli." }, { status: 400 });
    }

    const room = await prisma.room.findUnique({
      where: { code },
      include: { members: true },
    });
    if (!room) {
      return NextResponse.json({ error: "Oda bulunamadı." }, { status: 404 });
    }

    const updateData: { amount?: number; title?: string; paidById?: string } = {};
    if (body.amount !== undefined) {
      const parsed = Number(body.amount);
      if (Number.isNaN(parsed) || parsed <= 0) {
        return NextResponse.json({ error: "Geçersiz tutar." }, { status: 400 });
      }
      updateData.amount = parsed;
    }

    if (typeof body.title === "string" && body.title.trim()) {
      updateData.title = body.title.trim();
    }

    if (typeof body.paidById === "string" && body.paidById) {
      const validMember = room.members.some((m) => m.id === body.paidById);
      if (validMember) {
        updateData.paidById = body.paidById;
      }
    }

    const updated = await prisma.expense.update({
      where: { id: expenseId },
      data: updateData,
      include: { paidBy: true, category: true, period: true },
    });

    return NextResponse.json({ ok: true, expense: updated });
  } catch (error) {
    console.error("Expense PATCH error:", error);
    return NextResponse.json(
      { error: "Gider güncellenirken hata oluştu." },
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
    const expenseId = searchParams.get("id");
    const categoryId = searchParams.get("categoryId");
    const periodId = searchParams.get("periodId");

    const room = await prisma.room.findUnique({ where: { code } });
    if (!room) {
      return NextResponse.json({ error: "Oda bulunamadı." }, { status: 404 });
    }

    if (expenseId) {
      await prisma.expense.deleteMany({
        where: {
          id: expenseId,
          roomId: room.id,
        },
      });
      return NextResponse.json({ ok: true });
    }

    if (categoryId && periodId) {
      await prisma.expense.deleteMany({
        where: {
          roomId: room.id,
          categoryId,
          periodId,
        },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { error: "Silinecek gider ID veya kategori/dönem bilgisi gerekli." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Expense DELETE error:", error);
    return NextResponse.json(
      { error: "Gider silinirken hata oluştu." },
      { status: 500 }
    );
  }
}
