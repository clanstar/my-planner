import { useState, useEffect, useMemo } from 'react';
import { usePlanner } from '../store/PlannerContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { calculateWorkingDays, getWeeksRemaining, getMonthsRemaining } from '../utils/dateUtils';
import { Goal, CompletedTask } from '../types/planner';  

interface GoalProgressType {
  title: string;
  type: string;
  progress: number;
  completed: number;
  total: number;
  startDate?: string;
  endDate?: string;
}

export default function DashboardPage() {
  const { goals, todos, completedTasks = [] as CompletedTask[] } = usePlanner();
  const [goalProgress, setGoalProgress] = useState<GoalProgressType[]>([]);

  // 작업일 수 계산
  useEffect(() => {
    const calculateDays = async () => {
      try {
        const results = await Promise.all(goals.map(async (goal) => {
          const startDate = new Date(goal.startDate);
          const endDate = new Date(goal.endDate);

          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.warn('Invalid dates for goal:', goal);
            return {
              id: goal.id,
              workingDays: 0
            };
          }

          switch (goal.type) {
            case 'daily':
              return {
                id: goal.id,
                workingDays: await calculateWorkingDays(
                  startDate,
                  endDate,
                  goal.excludeWeekends ?? true,
                  goal.excludeHolidays ?? true
                )
              };

            case 'weekly':
              const weekDays = goal.weeklyDays?.length || 0;
              return {
                id: goal.id,
                workingDays: weekDays * getWeeksRemaining(startDate, endDate)
              };

            case 'monthly':
              return {
                id: goal.id,
                workingDays: getMonthsRemaining(startDate, endDate)
              };

            default:
              return { id: goal.id, workingDays: 0 };
          }
        }));

        // 각 목표별 작업일 수를 객체로 변환
        const workingDaysMap = results.reduce((acc, curr) => {
          acc[curr.id] = curr.workingDays;
          return acc;
        }, {} as Record<string, number>);

        // 목표별 진행률 계산 시 해당 목표의 작업일 수 사용
        const updatedProgress = goals.map(goal => {
          const progress = calculateProgress(goal);
          const total = workingDaysMap[goal.id] || 0;
          const completed = completedTasks.filter(task => task.goalId === goal.id).length;

          return {
            title: goal.title,
            type: goal.type,
            progress: Math.round(progress),
            completed,
            total,
            startDate: goal.startDate,
            endDate: goal.endDate
          };
        });

        setGoalProgress(updatedProgress);
      } catch (error) {
        console.error('작업일 수 계산 중 오류 발생:', error);
      }
    };

    calculateDays();
  }, [goals, completedTasks, todos]);
  
  const calculateProgress = (goal: Goal): number => {
    // 현재 날짜가 목표 기간 내인지 확인
    const now = new Date();
    const startDate = new Date(goal.startDate);
    const endDate = new Date(goal.endDate);
    
    if (now < startDate || now > endDate) {
      // 기간 외의 목표는 진행률 계산에서 제외
      return 0;
    }
    
    // 해당 목표의 완료된 할일 수
    const completed = todos.filter(todo => 
      todo.goalId === goal.id && todo.isCompleted
    ).length;
  
    // 해당 목표의 전체 할일 수
    const total = todos.filter(todo => 
      todo.goalId === goal.id
    ).length;
  
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  // 타입별 평균 달성률
  const typeAverages = useMemo(() => {
    const types = ['daily', 'weekly', 'monthly'] as const;
    return types.map(type => {
      const typeGoals = goalProgress.filter(g => g.type === type);
      const average = typeGoals.length
        ? typeGoals.reduce((acc, curr) => acc + curr.progress, 0) / typeGoals.length
        : 0;
      
      return {
        name: type === 'daily' ? '일간' : type === 'weekly' ? '주간' : '월간',
        value: Math.round(average)
      };
    });
  }, [goalProgress]);

  const completedTodoCount = useMemo(() => 
    todos.filter(todo => todo.isCompleted).length,
    [todos]
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">대시보드</h2>

      {/* 목표 진행 현황 */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-lg font-medium mb-4">목표별 진행 현황</h3>
        <div className="space-y-4">
          {goalProgress.map((goal) => (
            <div key={goal.title} className="space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium">{goal.title}</span>
                  <span className="ml-2 text-sm text-gray-500">
                    {goal.type === 'daily' ? '일간' : 
                     goal.type === 'weekly' ? '주간' : '월간'}
                  </span>
                </div>
                <span className="text-sm font-medium">
                  {goal.completed} / {goal.total} ({goal.progress}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${goal.progress}%` }}
                />
              </div>
            </div>
          ))}
          {goalProgress.length === 0 && (
            <p className="text-center text-gray-500 py-4">
              등록된 목표가 없습니다.
            </p>
          )}
        </div>
      </div>

      {/* 타입별 평균 달성률 차트 */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-lg font-medium mb-4">타입별 평균 달성률</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={typeAverages}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="달성률" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <h4 className="text-sm font-medium text-gray-500">전체 목표 수</h4>
          <p className="text-2xl font-bold mt-2">{goals.length}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <h4 className="text-sm font-medium text-gray-500">전체 할 일 수</h4>
          <p className="text-2xl font-bold mt-2">{todos.length}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <h4 className="text-sm font-medium text-gray-500">전체 완료율</h4>
          <p className="text-2xl font-bold mt-2">
            {todos.length 
              ? Math.round((completedTodoCount / todos.length) * 100)
              : 0}%
          </p>
        </div>
      </div>
    </div>
  );
}