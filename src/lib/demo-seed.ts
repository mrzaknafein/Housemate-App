import { prisma } from "./prisma";
import {
  buildBillingPeriod,
  DEFAULT_DORM_CATEGORIES,
  DEFAULT_HOUSE_CATEGORIES,
  getActiveBillingPeriod,
} from "./billing-cycle";
import { computeEqualPercentages } from "./split-calculator";

const AVATAR_COLORS = ["#cd853f", "#0f766e", "#b45309", "#1d4ed8", "#a16207"];

export function pickAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

/**
 * Generates a unique 6-character code like "HM-4829"
 */
export async function generateUniqueRoomCode(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const digits = Math.floor(1000 + Math.random() * 9000);
    const code = `HM-${digits}`;
    const existing = await prisma.room.findUnique({ where: { code } });
    if (!existing) return code;
  }
  const fallback = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `HM-${fallback}`;
}

/**
 * Seeds or resets sample 4-month historical + current data for a specific room
 * so Recharts monthly trends and % change badges immediately look rich.
 */
export async function populateSampleDataForRoom(roomId: string): Promise<void> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      members: { orderBy: { joinedAt: "asc" } },
      categories: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!room) return;

  // Ensure at least 2 members exist for realistic multi-user demo
  let members = room.members;
  if (members.length < 2) {
    const secondMember = await prisma.member.create({
      data: {
        roomId: room.id,
        name: room.type === "DORM" ? "Emre (Oda Arkadaşı)" : "Zeynep (Ev Arkadaşı)",
        token: `demo-member-${room.code}-${Date.now()}`,
        avatarColor: "#0f766e",
      },
    });
    members = [...members, secondMember];
  }

  // Ensure extra custom category ("Damacana Su" for House, or "Gece Kahvesi & Filtre" for Dorm)
  const extraCatName = room.type === "HOUSE" ? "Damacana Su" : "Kahve & Çay Köşesi";
  let categories = room.categories;
  if (!categories.some((c) => c.name === extraCatName)) {
    const newCat = await prisma.category.create({
      data: {
        roomId: room.id,
        name: extraCatName,
        icon: "Droplets",
        isDefault: false,
        sortOrder: categories.length + 1,
      },
    });
    categories = [...categories, newCat];
  }

  // Set Equal Splits on Categories (except Kira = 60/40 in House mode to demonstrate custom ratio)
  const memberIds = members.map((m) => m.id);
  const equalMap = computeEqualPercentages(memberIds);

  for (const cat of categories) {
    const isKiraCustom = room.type === "HOUSE" && cat.name === "Kira" && members.length === 2;
    await prisma.category.update({
      where: { id: cat.id },
      data: { hasCustomSplit: isKiraCustom },
    });

    for (let idx = 0; idx < members.length; idx++) {
      const m = members[idx];
      const pct = isKiraCustom ? (idx === 0 ? 60 : 40) : equalMap[m.id];
      await prisma.categorySplit.upsert({
        where: {
          categoryId_memberId: {
            categoryId: cat.id,
            memberId: m.id,
          },
        },
        update: { percentage: pct },
        create: {
          categoryId: cat.id,
          memberId: m.id,
          percentage: pct,
        },
      });
    }
  }

  // Clear existing expenses & periods to rebuild clean 4-period history
  await prisma.expense.deleteMany({ where: { roomId: room.id } });
  await prisma.periodCategorySplit.deleteMany({
    where: { period: { roomId: room.id } },
  });
  await prisma.billingPeriod.deleteMany({ where: { roomId: room.id } });

  const activeComputed = getActiveBillingPeriod(new Date(), room.cycleDay);
  const [actYearStr, actMonthStr] = activeComputed.periodKey.split("-");
  const actYear = parseInt(actYearStr, 10);
  const actMonthIndex = parseInt(actMonthStr, 10) - 1;

  // Create 4 periods: 3 historical + 1 active
  for (let offset = 3; offset >= 0; offset--) {
    const refDate = new Date(Date.UTC(actYear, actMonthIndex - offset, 1));
    const computed = buildBillingPeriod(
      refDate.getUTCFullYear(),
      refDate.getUTCMonth(),
      room.cycleDay
    );
    const isCurrent = offset === 0;

    const period = await prisma.billingPeriod.create({
      data: {
        roomId: room.id,
        periodKey: computed.periodKey,
        label: computed.label,
        startDate: computed.startDate,
        endDate: computed.endDate,
        isActive: isCurrent,
        isFrozen: !isCurrent,
      },
    });

    // Save period split snapshots
    for (const cat of categories) {
      const isKiraCustom = room.type === "HOUSE" && cat.name === "Kira" && members.length === 2;
      for (let idx = 0; idx < members.length; idx++) {
        const m = members[idx];
        const pct = isKiraCustom ? (idx === 0 ? 60 : 40) : equalMap[m.id];
        await prisma.periodCategorySplit.create({
          data: {
            periodId: period.id,
            categoryId: cat.id,
            memberId: m.id,
            percentage: pct,
          },
        });
      }
    }

    // Add realistic expenses for each category across the 4 months
    const m0 = members[0];
    const m1 = members[1 % members.length];
    const m2 = members[2 % members.length];

    if (room.type === "HOUSE") {
      const houseSeries: Record<string, number[]> = {
        Kira: [22000, 22000, 24000, 24000],
        Elektrik: [680, 740, 820, 910],
        Su: [310, 340, 325, 360],
        Doğalgaz: [420, 590, 950, 1280],
        İnternet: [450, 450, 500, 500],
      };

      const stepIdx = 3 - offset; // 0, 1, 2, 3

      for (const cat of categories) {
        if (cat.name === "Damacana Su") {
          // Multiple entries in the same month to showcase Aggregation rule!
          const waterPrices = [110, 115, 125, 130];
          const unitPrice = waterPrices[stepIdx];
          const orderCount = stepIdx === 3 ? 3 : stepIdx === 2 ? 2 : 3;
          for (let w = 0; w < orderCount; w++) {
            await prisma.expense.create({
              data: {
                roomId: room.id,
                periodId: period.id,
                categoryId: cat.id,
                paidById: w % 2 === 0 ? m0.id : m1.id,
                amount: unitPrice,
                title: `${w + 1}. Sipariş (19L Damacana Su)`,
                expenseDate: new Date(
                  computed.startDate.getTime() + (w * 7 + 2) * 86400000
                ),
              },
            });
          }
        } else if (houseSeries[cat.name]) {
          const amount = houseSeries[cat.name][stepIdx];
          await prisma.expense.create({
            data: {
              roomId: room.id,
              periodId: period.id,
              categoryId: cat.id,
              paidById: stepIdx % 2 === 0 ? m0.id : m1.id,
              amount,
              title: `${cat.name} Faturası`,
              expenseDate: new Date(computed.startDate.getTime() + 4 * 86400000),
            },
          });
        }
      }
    } else {
      // DORM series
      const stepIdx = 3 - offset;
      for (const cat of categories) {
        if (cat.name === "Damacana Su") {
          const count = stepIdx + 2;
          for (let w = 0; w < count; w++) {
            await prisma.expense.create({
              data: {
                roomId: room.id,
                periodId: period.id,
                categoryId: cat.id,
                paidById: w % 2 === 0 ? m0.id : m1.id,
                amount: 95,
                title: `${w + 1}. Damacana Su Siparişi`,
                expenseDate: new Date(
                  computed.startDate.getTime() + (w * 6 + 2) * 86400000
                ),
              },
            });
          }
        } else if (cat.name === "Oda Ortak Market/Atıştırmalık") {
          const marketAmounts = [420, 510, 480, 640];
          await prisma.expense.create({
            data: {
              roomId: room.id,
              periodId: period.id,
              categoryId: cat.id,
              paidById: m0.id,
              amount: marketAmounts[stepIdx] * 0.6,
              title: "Haftalık Market & Kahvaltılık",
              expenseDate: new Date(computed.startDate.getTime() + 3 * 86400000),
            },
          });
          await prisma.expense.create({
            data: {
              roomId: room.id,
              periodId: period.id,
              categoryId: cat.id,
              paidById: m2.id,
              amount: marketAmounts[stepIdx] * 0.4,
              title: "Atıştırmalık & Meyve",
              expenseDate: new Date(computed.startDate.getTime() + 12 * 86400000),
            },
          });
        } else if (cat.name === "Çamaşırhane/Kurutma") {
          const laundry = [180, 210, 195, 240];
          await prisma.expense.create({
            data: {
              roomId: room.id,
              periodId: period.id,
              categoryId: cat.id,
              paidById: m1.id,
              amount: laundry[stepIdx],
              title: "Yurt Çamaşır & Kurutma Fişleri",
              expenseDate: new Date(computed.startDate.getTime() + 8 * 86400000),
            },
          });
        } else if (cat.name === "Ortak Abonelikler") {
          const subs = [280, 280, 320, 320];
          await prisma.expense.create({
            data: {
              roomId: room.id,
              periodId: period.id,
              categoryId: cat.id,
              paidById: m0.id,
              amount: subs[stepIdx],
              title: "Netflix + Spotify Duo Paketi",
              expenseDate: new Date(computed.startDate.getTime() + 2 * 86400000),
            },
          });
        } else {
          const coffee = [150, 190, 220, 260];
          await prisma.expense.create({
            data: {
              roomId: room.id,
              periodId: period.id,
              categoryId: cat.id,
              paidById: m1.id,
              amount: coffee[stepIdx],
              title: "Filtre Kahve & Süt Tozu",
              expenseDate: new Date(computed.startDate.getTime() + 10 * 86400000),
            },
          });
        }
      }
    }
  }
}

/**
 * Ensures the two built-in demo rooms ("HM-DEMO" for House and "HM-YURT" for Dorm)
 * exist in the SQLite database so any user can test immediately.
 */
export async function ensureDefaultDemoRooms(): Promise<void> {
  const existingHouse = await prisma.room.findUnique({ where: { code: "HM-DEMO" } });
  if (!existingHouse) {
    const houseRoom = await prisma.room.create({
      data: {
        code: "HM-DEMO",
        name: "Moda Sahil Evi (Demo)",
        type: "HOUSE",
        cycleDay: 15,
      },
    });

    await prisma.member.createMany({
      data: [
        {
          roomId: houseRoom.id,
          name: "Çağatay",
          token: "demo-token-cagatay",
          avatarColor: "#cd853f",
        },
        {
          roomId: houseRoom.id,
          name: "Zeynep",
          token: "demo-token-zeynep",
          avatarColor: "#0f766e",
        },
      ],
    });

    for (const cat of DEFAULT_HOUSE_CATEGORIES) {
      await prisma.category.create({
        data: {
          roomId: houseRoom.id,
          name: cat.name,
          icon: cat.icon,
          isDefault: true,
          sortOrder: cat.sortOrder,
        },
      });
    }

    await populateSampleDataForRoom(houseRoom.id);
  }

  const existingDorm = await prisma.room.findUnique({ where: { code: "HM-YURT" } });
  if (!existingDorm) {
    const dormRoom = await prisma.room.create({
      data: {
        code: "HM-YURT",
        name: "B Blok 304 Yurt Odası (Demo)",
        type: "DORM",
        cycleDay: 1,
      },
    });

    await prisma.member.createMany({
      data: [
        {
          roomId: dormRoom.id,
          name: "Mert",
          token: "demo-token-mert",
          avatarColor: "#cd853f",
        },
        {
          roomId: dormRoom.id,
          name: "Kerem",
          token: "demo-token-kerem",
          avatarColor: "#0f766e",
        },
        {
          roomId: dormRoom.id,
          name: "Arda",
          token: "demo-token-arda",
          avatarColor: "#b45309",
        },
      ],
    });

    for (const cat of DEFAULT_DORM_CATEGORIES) {
      await prisma.category.create({
        data: {
          roomId: dormRoom.id,
          name: cat.name,
          icon: cat.icon,
          isDefault: true,
          sortOrder: cat.sortOrder,
        },
      });
    }

    await populateSampleDataForRoom(dormRoom.id);
  }
}
