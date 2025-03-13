import { useState, useEffect } from 'react';
import { usePlanner } from '../store/PlannerContext';
import { Clock, Calendar, CheckCircle2, XCircle, Save, Trash2, FileDown } from 'lucide-react';
import { exportDiaryToExcel } from '../utils/excelUtils';

interface ExportDateRange {
  startDate: string;
  endDate: string;
}

export default function DiaryPage() {
  const { todos, diaryEntries, addDiaryEntry, updateDiaryEntry, deleteDiaryEntry } = usePlanner();
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    // 현지 시간대 기준으로 날짜 문자열 생성 (YYYY-MM-DD)
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [diaryContent, setDiaryContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDateRange, setExportDateRange] = useState<ExportDateRange>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    
    return {
      startDate: todayStr,
      endDate: todayStr
    };
  });

  // 선택된 날짜의 모든 일정 가져오기
  const dailyTodos = todos
  .filter(todo => todo.scheduledDate === selectedDate)
  .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  // 현재 선택된 날짜의 다이어리 엔트리
  const currentDiaryEntry = diaryEntries.find(entry => entry.date === selectedDate);

  useEffect(() => {
    if (currentDiaryEntry) {
      setDiaryContent(currentDiaryEntry.content);
    } else {
      setDiaryContent('');
    }
    setIsEditing(false);
  }, [selectedDate, currentDiaryEntry]);

  const handleSaveDiary = () => {
    if (diaryContent.trim()) {
      if (currentDiaryEntry) {
        updateDiaryEntry({
          ...currentDiaryEntry,
          content: diaryContent.trim()
        });
      } else {
        addDiaryEntry({
          id: crypto.randomUUID(),
          date: selectedDate,
          content: diaryContent.trim()
        });
      }
      setIsEditing(false);
    }
  };

  const handleDeleteDiary = () => {
    if (currentDiaryEntry && window.confirm('다이어리 내용을 삭제하시겠습니까?')) {
      deleteDiaryEntry(currentDiaryEntry.id);
      setDiaryContent('');
      setIsEditing(false);
    }
  };

  const handleExportExcel = () => {
    if (diaryEntries.length === 0) {
      alert('내보낼 다이어리 내용이 없습니다.');
      return;
    }
    setShowExportModal(true);
  };

  const handleConfirmExport = () => {
    const { startDate, endDate } = exportDateRange;
    if (startDate > endDate) {
      alert('시작 날짜는 종료 날짜보다 이전이어야 합니다.');
      return;
    }
    
    const filteredEntries = diaryEntries.filter(
      entry => entry.date >= startDate && entry.date <= endDate
    );

    if (filteredEntries.length === 0) {
      alert('선택한 기간에 해당하는 다이어리 내용이 없습니다.');
      return;
    }

    exportDiaryToExcel(diaryEntries, todos, startDate, endDate);
    setShowExportModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">다이어리</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700"
            title="엑셀로 내보내기"
          >
            <FileDown className="w-5 h-5" />
            엑셀 내보내기
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="p-2 border rounded"
          />
        </div>
      </div>

      {/* 일정 목록 */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-lg font-medium mb-4">일정</h3>
        <div className="space-y-3">
          {dailyTodos.map((todo) => (
            <div key={todo.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded">
              {todo.isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-1" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400 mt-1" />
              )}
              <div>
                <h4 className={`font-medium ${todo.isCompleted ? 'line-through text-gray-500' : ''}`}>
                  {todo.title}
                </h4>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {todo.scheduledTime}
                  </div>
                  {todo.isCompleted && todo.actualCompletionTime && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      완료: {new Date(todo.actualCompletionTime).toLocaleTimeString()}
                    </div>
                  )}
                  {todo.isFromGoal && (
                    <span className="text-blue-500">목표 연결됨</span>
                  )}
                </div>
                {todo.note && (
                  <p className="mt-1 text-sm text-gray-600">{todo.note}</p>
                )}
              </div>
            </div>
          ))}
          {dailyTodos.length === 0 && (
            <p className="text-center text-gray-500 py-4">
              해당 날짜에 예정된 일정이 없습니다.
            </p>
          )}
        </div>
      </div>

      {/* 다이어리 작성 영역 */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-lg font-medium mb-4">오늘의 기록</h3>
        <div className="space-y-4">
          <textarea
            value={isEditing ? diaryContent : (currentDiaryEntry?.content || '')}
            onChange={(e) => {
              const content = e.target.value;
              if (content.length <= 500) {
                setDiaryContent(content);
                setIsEditing(true);
              }
            }}
            onClick={() => !isEditing && setIsEditing(true)}
            placeholder="오늘 하루를 기록해보세요 (최대 500자)"
            className="w-full p-3 border rounded-lg h-40 resize-none"
            readOnly={!isEditing}
          />
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">
              {(isEditing ? diaryContent : (currentDiaryEntry?.content || '')).length} / 500자
            </span>
            <div className="flex gap-2">
              {currentDiaryEntry && (
                <button
                  onClick={handleDeleteDiary}
                  className="px-4 py-2 text-red-500 hover:text-red-600 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  삭제
                </button>
              )}
              {isEditing && (
                <button
                  onClick={handleSaveDiary}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  저장
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 내보내기 모달 */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">기간 선택</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">시작 날짜</label>
                <input
                  type="date"
                  value={exportDateRange.startDate}
                  onChange={(e) => setExportDateRange(prev => ({
                    ...prev,
                    startDate: e.target.value
                  }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">종료 날짜</label>
                <input
                  type="date"
                  value={exportDateRange.endDate}
                  onChange={(e) => setExportDateRange(prev => ({
                    ...prev,
                    endDate: e.target.value
                  }))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
                >
                  취소
                </button>
                <button
                  onClick={handleConfirmExport}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  내보내기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}