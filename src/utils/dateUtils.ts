import { addDays, format, getDay, getDate, setDate } from 'date-fns';
import { HolidayService } from './holidayUtils';

// 날짜가 주말인지 확인
export const isWeekend = (date: Date): boolean => {
  const day = getDay(date);
  return day === 0 || day === 6;
};

// 날짜가 공휴일인지 확인
export const isHoliday = async (date: Date): Promise<boolean> => {
  return await HolidayService.isHoliday(date);
};

// 특정 주차의 특정 요일 찾기
const findDayInWeek = (date: Date, weekNumber: number, dayOfWeek: number): Date => {
  const firstDay = setDate(date, 1);
  let currentDay = firstDay;
  let currentWeek = 1;

  while (getDay(currentDay) !== dayOfWeek) {
    currentDay = addDays(currentDay, 1);
  }

  while (currentWeek < weekNumber) {
    currentDay = addDays(currentDay, 7);
    currentWeek++;
  }

  return currentDay;
};

// 남은 주 수 계산
export const getWeeksRemaining = (startDate: Date, endDate: Date): number => {
  return Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
};

// 남은 월 수 계산
export const getMonthsRemaining = (startDate: Date, endDate: Date): number => {
  return (endDate.getFullYear() - startDate.getFullYear()) * 12 
    + (endDate.getMonth() - startDate.getMonth()) + 1;
};

// 영업일 계산 함수 추가
export const calculateWorkingDays = async (startDate: Date, endDate: Date, excludeWeekends: boolean, excludeHolidays: boolean) => {
  let totalDays = 0;
  let currentDate = startDate;

  while (currentDate <= endDate) {
    let isWorkingDay = true;

    if (excludeWeekends && isWeekend(currentDate)) {
      isWorkingDay = false;
    }

    if (excludeHolidays && await HolidayService.isHoliday(currentDate)) {
      isWorkingDay = false;
    }

    if (isWorkingDay) {
      totalDays++;
    }

    currentDate = addDays(currentDate, 1);
  }

  return totalDays;
};

interface Goal {
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
  startDate: string;     // 시작일
  endDate: string;       // 종료일
  duration?: {
    value: number;       // 기간 값
    unit: 'days' | 'weeks' | 'months';  // 기간 단위
  };
}

export const generateTodosFromGoal = async (goal: Goal, startDate: Date, endDate: Date) => {
  if (!goal.startDate || !goal.endDate) {
    console.warn('Goal dates are missing:', goal);
    return [];
  }

  const goalStartDate = new Date(goal.startDate);
  const goalEndDate = new Date(goal.endDate);

  if (isNaN(goalStartDate.getTime()) || isNaN(goalEndDate.getTime())) {
    console.warn('Invalid goal dates:', goal);
    return [];
  }

  // 시작일과 종료일 중 더 늦은/이른 날짜 사용
  const effectiveStartDate = new Date(Math.max(startDate.getTime(), goalStartDate.getTime()));
  const effectiveEndDate = new Date(Math.min(endDate.getTime(), goalEndDate.getTime()));

  // 유효한 날짜 범위 확인
  if (effectiveStartDate > effectiveEndDate) {
    console.warn('Invalid date range:', { effectiveStartDate, effectiveEndDate });
    return [];
  }

  const todos = [];
  let currentDate = new Date(effectiveStartDate);
  
  while (currentDate <= effectiveEndDate) {
    let shouldAddTodo = false;
    
    switch (goal.type) {
      case 'daily':
        shouldAddTodo = true;
        if (goal.excludeWeekends && isWeekend(currentDate)) shouldAddTodo = false;
        if (goal.excludeHolidays && await isHoliday(currentDate)) shouldAddTodo = false;
        break;

      case 'weekly':
        if (goal.weeklyDays?.includes(getDay(currentDate))) {
          shouldAddTodo = true;
          if (goal.excludeHolidays && await isHoliday(currentDate)) shouldAddTodo = false;
        }
        break;

      case 'monthly':
        if (goal.monthlyType === 'specific-date' && goal.specificDate) {
          shouldAddTodo = getDate(currentDate) === goal.specificDate;
        } else if (
          goal.monthlyType === 'specific-week-day' &&
          goal.specificWeek &&
          goal.specificWeekDay !== undefined
        ) {
          const targetDate = findDayInWeek(currentDate, goal.specificWeek, goal.specificWeekDay);
          shouldAddTodo = format(currentDate, 'yyyy-MM-dd') === format(targetDate, 'yyyy-MM-dd');
        }
        if (shouldAddTodo && goal.excludeHolidays && await isHoliday(currentDate)) {
          shouldAddTodo = false;
        }
        break;
    }

    console.log('Current date:', { 
      date: currentDate.toISOString(), 
      shouldAddTodo 
    }); // 디버깅용

    if (shouldAddTodo) {
      todos.push({
        id: crypto.randomUUID(),
        title: goal.title,
        scheduledDate: format(currentDate, 'yyyy-MM-dd'),
        scheduledTime: goal.scheduledTime,
        isFromGoal: true,
        goalId: goal.id,
        isCompleted: false
      });
    }

    currentDate = addDays(currentDate, 1);
  }

  return todos;
};