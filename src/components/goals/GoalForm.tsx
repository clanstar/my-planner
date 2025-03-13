import { useState } from 'react';
import { Plus, Edit2, X } from 'lucide-react';

// FormData 타입을 별도로 정의
type FormData = {
  title: string;
  type: 'daily' | 'weekly' | 'monthly';
  description: string;
  scheduledTime: string;
  startDate: string;
  endDate: string;
  excludeWeekends: boolean;
  excludeHolidays: boolean;
  weeklyDays: number[];
  monthlyType: 'specific-date' | 'specific-week-day';
  specificDate: number;
  specificWeek: number;
  specificWeekDay: number;
}

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
  startDate: string;
  endDate: string;
}

interface GoalFormProps {
  goal?: Goal;
  onSubmit: (goal: Goal) => void;
}

const initialFormState: FormData = {
  title: '',
  type: 'daily',
  description: '',
  scheduledTime: '',
  startDate: (() => {
    // 현재 날짜를 현지 시간대 기준으로 가져옴
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })(),
  endDate: '2025-12-31',
  excludeWeekends: true,
  excludeHolidays: true,
  weeklyDays: [],
  monthlyType: 'specific-date',
  specificDate: 1,
  specificWeek: 1,
  specificWeekDay: 0
};

export default function GoalForm({ goal, onSubmit }: GoalFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState(goal ? {
    ...initialFormState,
    ...goal
  } : initialFormState);

  const resetForm = () => {
    setFormData(initialFormState);
    setIsOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newGoal: Goal = {
      id: goal?.id || crypto.randomUUID(),
      ...formData,
      // ISO 문자열로 명시적 변환
      startDate: formData.startDate,
      endDate: formData.endDate,
      createdAt: goal?.createdAt || new Date().toISOString()
    };
    console.log('newGoal', newGoal);
    onSubmit(newGoal);
    resetForm();
  };

  if (!isOpen) {
    return goal ? (
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 text-gray-600 hover:text-blue-600 rounded-full hover:bg-gray-100"
        title="수정"
      >
        <Edit2 className="w-4 h-4" />
      </button>
    ) : (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        <Plus className="w-4 h-4" />
        새 목표 추가
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {goal ? '목표 수정' : '새 목표 추가'}
          </h2>
          <button 
            onClick={resetForm}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">목표 유형</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'daily' | 'weekly' | 'monthly' })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={!!goal}
            >
              <option value="daily">일간</option>
              <option value="weekly">주간</option>
              <option value="monthly">월간</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              제목
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">설명</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              maxLength={500}
            />
          </div>
       
          {/* 예정 시간 입력 필드 */}
          <div>
            <label className="block text-sm font-medium mb-1">
              예정 시간
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="time"
              value={formData.scheduledTime}
              onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
            
          {/* 기간 설정 필드 */}
          <div>
            <label className="block text-sm font-medium mb-1">
              기간 설정
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">시작일</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1">종료일</label>
                <input
                  type="date"
                  value={formData.endDate}
                  min={formData.startDate} // 시작일 이전 날짜 선택 방지
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
            {new Date(formData.endDate) < new Date(formData.startDate) && (
              <p className="text-red-500 text-sm mt-1">종료일은 시작일 이후여야 합니다.</p>
            )}
          </div>

          {formData.type === 'daily' && (
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.excludeWeekends}
                  onChange={(e) => setFormData({ ...formData, excludeWeekends: e.target.checked })}
                  className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                주말 제외
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.excludeHolidays}
                  onChange={(e) => setFormData({ ...formData, excludeHolidays: e.target.checked })}
                  className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                공휴일 제외
              </label>
            </div>
          )}

          {formData.type === 'weekly' && (
            <div>
              <label className="block text-sm font-medium mb-1">반복할 요일</label>
              <div className="flex flex-wrap gap-3">
                {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                  <label key={day} className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.weeklyDays.includes(index)}
                      onChange={(e) => {
                        const days = e.target.checked
                          ? [...formData.weeklyDays, index]
                          : formData.weeklyDays.filter(d => d !== index);
                        setFormData({ ...formData, weeklyDays: days.sort() });
                      }}
                      className="mr-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>
          )}

          {formData.type === 'monthly' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">반복 유형</label>
                <select
                  value={formData.monthlyType}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    monthlyType: e.target.value as 'specific-date' | 'specific-week-day' 
                  })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="specific-date">특정 날짜</option>
                  <option value="specific-week-day">특정 요일</option>
                </select>
              </div>

              {formData.monthlyType === 'specific-date' ? (
                <div>
                  <label className="block text-sm font-medium mb-1">날짜 선택</label>
                  <select
                    value={formData.specificDate}
                    onChange={(e) => setFormData({ ...formData, specificDate: Number(e.target.value) })}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(date => (
                      <option key={date} value={date}>{date}일</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">몇째주</label>
                    <select
                      value={formData.specificWeek}
                      onChange={(e) => setFormData({ ...formData, specificWeek: Number(e.target.value) })}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {[1, 2, 3, 4, 5].map(week => (
                        <option key={week} value={week}>{week}째주</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">요일 선택</label>
                    <select
                      value={formData.specificWeekDay}
                      onChange={(e) => setFormData({ ...formData, specificWeekDay: Number(e.target.value) })}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                        <option key={day} value={index}>{day}요일</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <button 
              type="button" 
              onClick={resetForm}
              className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100 transition-colors"
            >
              취소
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              {goal ? '수정' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}