import { useState, useMemo, useEffect } from 'react';
import { usePlanner } from '../store/PlannerContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  format,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  getDay
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { Todo } from '../types/planner';
import { HolidayService } from '../utils/holidayUtils';

interface TodosByDate {
  [key: string]: Todo[];
}

interface HolidaysByDate {
  [key: string]: string;  // 날짜: 공휴일 이름
}

export default function CalendarPage() {
  const { todos } = usePlanner();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [holidays, setHolidays] = useState<HolidaysByDate>({});

  // 현재 달력에 표시할 날짜들 계산
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // 공휴일 정보 가져오기
  useEffect(() => {
    const fetchHolidays = async () => {
      const year = currentDate.getFullYear();
      const monthHolidays = await HolidayService.getHolidays(year);
      const holidayMap: HolidaysByDate = {};
      monthHolidays.forEach(holiday => {
        holidayMap[holiday.date] = holiday.name;
      });
      setHolidays(holidayMap);
    };

    fetchHolidays();
  }, [currentDate]);

  // 날짜별 할 일 그룹화
  const todosByDate = useMemo(() => {
    return todos.reduce<TodosByDate>((acc, todo) => {
      const date = todo.scheduledDate;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(todo);
      return acc;
    }, {});
  }, [todos]);

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">달력</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-medium">
            {format(currentDate, 'yyyy년 M월', { locale: ko })}
          </h3>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 gap-px border-b bg-gray-50">
          {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
            <div
              key={day}
              className={`px-2 py-3 text-center text-sm font-medium ${
                day === '일' ? 'text-red-600' : 
                day === '토' ? 'text-blue-600' : ''
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 달력 그리드 */}
        <div className="grid grid-cols-7 gap-px">
          {calendarDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayTodos = todosByDate[dateStr] || [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            const isWeekend = getDay(day) === 0 || getDay(day) === 6;
            const holidayName = holidays[dateStr];
            
            return (
              <div
                key={dateStr}
                className={`min-h-32 p-2 ${
                  isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span
                    className={`text-sm font-medium ${
                      !isCurrentMonth && 'text-gray-400'
                    } ${isToday && 'bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center'}
                    ${!isToday && isWeekend && getDay(day) === 0 ? 'text-red-600' : ''}
                    ${!isToday && isWeekend && getDay(day) === 6 ? 'text-blue-600' : ''}`}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
                {holidayName && (
                  <div className="mt-1">
                    <span className="text-xs text-red-600 font-medium">
                      {holidayName}
                    </span>
                  </div>
                )}
                <div className="mt-1 space-y-1">
                  {dayTodos.map((todo) => (
                    <div
                      key={todo.id}
                      className={`px-2 py-1 text-xs rounded ${
                        todo.isCompleted
                          ? 'bg-green-100 text-green-800'
                          : todo.isFromGoal
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <div className="truncate font-medium">
                        {todo.title}
                      </div>
                      <div className="text-xs">
                        {todo.scheduledTime}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}