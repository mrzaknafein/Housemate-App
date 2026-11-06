import { prisma } from "./prisma";

export interface SplitShareItem {
  memberId: string;
  memberName: string;
  avatarColor: string;
  percentage: number;
  amountShare: number;
}

/**
 * Calculates equal percentages that sum to 100.0 (e.g. 2 members -> 50, 50; 3 members -> 33.34, 33.33, 33.33)
 */
export function computeEqualPercentages(memberIds: string[]): Record<string, number> {
  const count = memberIds.length;
  if (count === 0) return {};
  const base = Math.floor((100 / count) * 10) / 10; // 1 decimal place e.g. 33.3
  const result: Record<string, number> = {};
  let sum = 0;

  memberIds.forEach((id, idx) => {
    if (idx === count - 1) {
      result[id] = Number((100 - sum).toFixed(1));
    } else {
      result[id] = base;
      sum += base;
    }
  });

  return result;
}

/**
 * Synchronizes default equal splits when a new member joins a room.
 * - Preserves historical (frozen or non-active) periods so past accounting never breaks.
 * - Updates only non-custom categories in CategorySplit and the currently active BillingPeriod.
 */
export async function syncRoomEqualSplitsForActivePeriod(roomId: string): Promise<void> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      members: { orderBy: { joinedAt: "asc" } },
      categories: true,
      periods: { where: { isActive: true } },
    },
  });

  if (!room || room.members.length === 0) return;

  const memberIds = room.members.map((m) => m.id);
  const equalMap = computeEqualPercentages(memberIds);

  for (const category of room.categories) {
    if (!category.hasCustomSplit) {
      // Update current CategorySplit rows
      for (const mId of memberIds) {
        const pct = equalMap[mId] ?? 0;
        await prisma.categorySplit.upsert({
          where: {
            categoryId_memberId: {
              categoryId: category.id,
              memberId: mId,
            },
          },
          update: { percentage: pct },
          create: {
            categoryId: category.id,
            memberId: mId,
            percentage: pct,
          },
        });
      }

      // Also update the active period's snapshot if not frozen
      for (const activePeriod of room.periods) {
        if (!activePeriod.isFrozen) {
          for (const mId of memberIds) {
            const pct = equalMap[mId] ?? 0;
            await prisma.periodCategorySplit.upsert({
              where: {
                periodId_categoryId_memberId: {
                  periodId: activePeriod.id,
                  categoryId: category.id,
                  memberId: mId,
                },
              },
              update: { percentage: pct },
              create: {
                periodId: activePeriod.id,
                categoryId: category.id,
                memberId: mId,
                percentage: pct,
              },
            });
          }
        }
      }
    } else {
      // Category has custom split: ensure new member has a 0% entry so UI displays them cleanly
      for (const mId of memberIds) {
        await prisma.categorySplit.upsert({
          where: {
            categoryId_memberId: {
              categoryId: category.id,
              memberId: mId,
            },
          },
          update: {},
          create: {
            categoryId: category.id,
            memberId: mId,
            percentage: 0,
          },
        });
      }
    }
  }
}
