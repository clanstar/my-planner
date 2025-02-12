// src/types/planner.ts

export interface Goal {
    id: string;
    title: string;
    type: 'daily' | 'weekly' | 'monthly';
    description?: string;
    scheduledTime: string;
    excludeWeekends?: boolean;
    excludeHolidays?: boolean;
    weeklyDays?: number[];
    monthlyType?: 'specific-date' | 'specific-week-day';
    specificDate?: number;
    specificWeek?: number;
    specificWeekDay?: number;
    createdAt: string;
    startDate: string;
    endDate: string;
  }
  
  export interface Todo {
    id: string;
    title: string;
    scheduledDate: string;
    scheduledTime: string;
    isFromGoal: boolean;
    goalId?: string;
    isCompleted: boolean;
    actualCompletionTime?: string;
    note?: string;
  }
  
  export interface DiaryEntry {
    id: string;
    date: string;
    content: string;
  }
  
  export interface CompletedTask {
    id: string;
    goalId: string;
    completedDate: string;
    scheduledDate: string;
    type: 'daily' | 'weekly' | 'monthly';
  }