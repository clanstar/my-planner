import { addDays, getDay, getDate, setDate } from 'date-fns';
import { HolidayService } from './holidayUtils';
import { Todo } from '../types/planner';
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

// YYYY-MM-DD 형식의 현재 날짜 문자열을 현지 시간대 기준으로 반환
export const getCurrentDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 날짜 문자열 포맷터 (UTC -> 현지 시간대 고려)
export const formatDateToLocalString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// generateTodosFromGoal 함수 디버깅 향상을 위한 업데이트
export const generateTodosFromGoal = async (goal: Goal, startDate: Date, endDate: Date) => {
  console.log(`Generating todos for goal: ${goal.title} (${goal.id})`);
  console.log(`Input date range: ${startDate.toISOString()} - ${endDate.toISOString()}`);

  const todos: Todo[] = [];
  const formatToYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const effectiveStartDate = new Date(Math.max(startDate.getTime(), new Date(goal.startDate).getTime()));
  const effectiveEndDate = new Date(Math.min(endDate.getTime(), new Date(goal.endDate).getTime()));

  console.log(`Effective date range: ${formatToYYYYMMDD(effectiveStartDate)} - ${formatToYYYYMMDD(effectiveEndDate)}`);

  if (effectiveStartDate > effectiveEndDate) {
    console.warn('Invalid effective date range');
    return todos;
  }

  let currentDate = new Date(effectiveStartDate);

  switch (goal.type) {
    case 'daily':
      while (currentDate <= effectiveEndDate) {
        const isExcluded = (goal.excludeWeekends && isWeekend(currentDate)) ||
                          (goal.excludeHolidays && await isHoliday(currentDate));
        if (!isExcluded) {
          todos.push({
            id: crypto.randomUUID(),
            title: goal.title,
            scheduledDate: formatToYYYYMMDD(currentDate),
            scheduledTime: goal.scheduledTime,
            isFromGoal: true,
            goalId: goal.id,
            isCompleted: false
          });
        }
        currentDate = addDays(currentDate, 1);
      }
      break;

    case 'weekly':
      while (currentDate <= effectiveEndDate) {
        if (goal.weeklyDays?.includes(getDay(currentDate))) {
          todos.push({
            id: crypto.randomUUID(),
            title: goal.title,
            scheduledDate: formatToYYYYMMDD(currentDate),
            scheduledTime: goal.scheduledTime,
            isFromGoal: true,
            goalId: goal.id,
            isCompleted: false
          });
        }
        currentDate = addDays(currentDate, 1);
      }
      break;

    case 'monthly':
      while (currentDate <= effectiveEndDate) {
        if (goal.monthlyType === 'specific-date' && getDate(currentDate) === goal.specificDate) {
          todos.push({
            id: crypto.randomUUID(),
            title: goal.title,
            scheduledDate: formatToYYYYMMDD(currentDate),
            scheduledTime: goal.scheduledTime,
            isFromGoal: true,
            goalId: goal.id,
            isCompleted: false
          });
        } else if (goal.monthlyType === 'specific-week-day') {
          const targetDate = findDayInWeek(currentDate, goal.specificWeek || 1, goal.specificWeekDay || 0);
          if (targetDate >= effectiveStartDate && targetDate <= effectiveEndDate &&
              formatToYYYYMMDD(targetDate) === formatToYYYYMMDD(currentDate)) {
            todos.push({
              id: crypto.randomUUID(),
              title: goal.title,
              scheduledDate: formatToYYYYMMDD(currentDate),
              scheduledTime: goal.scheduledTime,
              isFromGoal: true,
              goalId: goal.id,
              isCompleted: false
            });
          }
        }
        currentDate = addDays(currentDate, 1);
      }
      break;

    default:
      console.warn(`Unsupported goal type: ${goal.type}`);
  }

  console.log(`Generated ${todos.length} todos for goal: ${goal.title}`, todos);
  return todos;
};