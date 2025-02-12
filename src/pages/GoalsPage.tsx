import { Trash2 } from 'lucide-react';
import GoalForm from '../components/goals/GoalForm';
import { usePlanner } from '../store/PlannerContext';
import { Goal } from '../types/planner';


export default function GoalsPage() {
  const { goals, addGoal, updateGoal, deleteGoal } = usePlanner();

  const getGoalScheduleText = (goal: Goal) => {
    switch (goal.type) {
      case 'daily':
        return `매일 ${goal.scheduledTime} ${goal.excludeWeekends ? '(주말 제외)' : ''} ${goal.excludeHolidays ? '(공휴일 제외)' : ''}`;
      case 'weekly':
        const days = goal.weeklyDays?.map(day => ['일', '월', '화', '수', '목', '금', '토'][day]).join(', ');
        return `매주 ${days} ${goal.scheduledTime}`;
      case 'monthly':
        if (goal.monthlyType === 'specific-date') {
          return `매월 ${goal.specificDate}일 ${goal.scheduledTime}`;
        } else {
          return `매월 ${goal.specificWeek}째주 ${['일', '월', '화', '수', '목', '금', '토'][goal.specificWeekDay || 0]}요일 ${goal.scheduledTime}`;
        }
      default:
        return goal.scheduledTime;
    }
  };

  const handleDeleteGoal = (goalId: string) => {
    if (window.confirm('이 목표를 삭제하시겠습니까? 관련된 모든 할 일도 함께 삭제됩니다.')) {
      deleteGoal(goalId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">목표 관리</h2>
        <GoalForm onSubmit={addGoal} />
      </div>
  
      <div className="grid gap-4">
        {goals.map((goal) => (
          <div
            key={goal.id}
            className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium">{goal.title}</h3>
                {goal.description && (
                  <p className="mt-2 text-gray-600">{goal.description}</p>
                )}
                <div className="mt-2 space-y-1">
                  <div className="text-sm text-gray-500">
                    {getGoalScheduleText(goal)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {`${goal.startDate} ~ ${goal.endDate}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <GoalForm 
                  goal={goal}
                  onSubmit={updateGoal}
                />
                <button
                  onClick={() => handleDeleteGoal(goal.id)}
                  className="p-2 text-gray-600 hover:text-red-600 rounded-full hover:bg-gray-100"
                  title="삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <span className="px-2 py-1 text-xs font-medium text-white rounded-full"
                  style={{
                    backgroundColor: 
                      goal.type === 'daily' ? '#4F46E5' : 
                      goal.type === 'weekly' ? '#059669' : 
                      '#B45309'
                  }}
                >
                  {goal.type === 'daily' ? '일간' : 
                   goal.type === 'weekly' ? '주간' : '월간'}
                </span>
              </div>
            </div>
          </div>
        ))}
        {goals.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            아직 등록된 목표가 없습니다. 새 목표를 추가해보세요!
          </p>
        )}
      </div>
    </div>
  );
}