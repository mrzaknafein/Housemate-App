export interface RoomMember {
  id: string;
  roomId: string;
  name: string;
  token: string;
  avatarColor: string;
  joinedAt: string;
}

export interface CategorySplitItem {
  id: string;
  categoryId: string;
  memberId: string;
  percentage: number;
}

export interface RoomCategory {
  id: string;
  roomId: string;
  name: string;
  icon: string;
  isDefault: boolean;
  hasCustomSplit: boolean;
  sortOrder: number;
  splits: CategorySplitItem[];
}

export interface PeriodCategorySplitItem {
  id: string;
  periodId: string;
  categoryId: string;
  memberId: string;
  percentage: number;
  isZeroConfirmed?: boolean;
}

export interface BillingPeriodItem {
  id: string;
  roomId: string;
  periodKey: string;
  label: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isFrozen: boolean;
  periodSplits: PeriodCategorySplitItem[];
}

export interface ExpenseItem {
  id: string;
  roomId: string;
  periodId: string;
  categoryId: string;
  paidById: string;
  amount: number;
  title: string;
  expenseDate: string;
  createdAt: string;
  paidBy: RoomMember;
  category: {
    id: string;
    name: string;
    icon: string;
  };
  period: {
    id: string;
    periodKey: string;
    label: string;
  };
}

export interface RoomData {
  id: string;
  code: string;
  name: string;
  type: "HOUSE" | "DORM";
  cycleDay: number;
  members: RoomMember[];
  categories: RoomCategory[];
  periods: BillingPeriodItem[];
  expenses: ExpenseItem[];
}

export interface HistoricalPeriodTemplate {
  periodKey: string;
  label: string;
  startDate: string;
  endDate: string;
}
