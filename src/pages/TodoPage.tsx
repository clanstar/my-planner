import { useState } from 'react';
import { Plus, Clock, Edit2, Trash2, X } from 'lucide-react';
import { usePlanner } from '../store/PlannerContext';
import { Todo } from '../types/planner';

interface TodoFormData {
  title: string;
  scheduledTime: string;
  note: string;
}

export default function TodoPage() {
  const { todos, addTodo, updateTodo, deleteTodo } = usePlanner();
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [showForm, setShowForm] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [formData, setFormData] = useState<TodoFormData>({
    title: '',
    scheduledTime: '',
    note: ''
  });

  const resetForm = () => {
    setFormData({ title: '', scheduledTime: '', note: '' });
    setEditingTodo(null);
    setShowForm(false);
  };

  const handleAddOrUpdateTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTodo) {
      // 할일 수정
      updateTodo({
        ...editingTodo,
        title: formData.title,
        scheduledTime: formData.scheduledTime,
        note: formData.note
      });
    } else {
      // 새 할일 추가
      const newTodo = {
        id: crypto.randomUUID(),
        title: formData.title,
        scheduledDate: selectedDate,
        scheduledTime: formData.scheduledTime,
        isFromGoal: false,
        isCompleted: false,
        note: formData.note
      };
      addTodo(newTodo);
    }
    resetForm();
  };

  const handleEditTodo = (todo: Todo) => {
    setEditingTodo(todo);
    setFormData({
      title: todo.title,
      scheduledTime: todo.scheduledTime,
      note: todo.note || ''
    });
    setShowForm(true);
  };

  const handleDeleteTodo = (todoId: string) => {
    if (window.confirm('이 할일을 삭제하시겠습니까?')) {
      deleteTodo(todoId);
    }
  };

  const handleCompleteTodo = (todoId: string) => {
    const todo = todos.find(t => t.id === todoId);
    if (todo) {
      updateTodo({
        ...todo,
        isCompleted: !todo.isCompleted,
        actualCompletionTime: !todo.isCompleted ? new Date().toISOString() : undefined
      });
    }
  };

  const todosForSelectedDate = todos
    .filter(todo => todo.scheduledDate === selectedDate)
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">할 일 목록</h2>
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="p-2 border rounded"
          />
          <button
            onClick={() => {
              setEditingTodo(null);
              setFormData({ title: '', scheduledTime: '', note: '' });
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Plus className="w-4 h-4" />
            새 일정 추가
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                {editingTodo ? '일정 수정' : '새 일정 추가'}
              </h3>
              <button 
                onClick={resetForm}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddOrUpdateTodo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">제목</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">시간</label>
                <input
                  type="time"
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">메모</label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full p-2 border rounded"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {editingTodo ? '수정' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {todosForSelectedDate.map((todo) => (
          <div
            key={todo.id}
            className={`p-4 border rounded-lg ${
              todo.isCompleted ? 'bg-gray-50' : 'bg-white'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={todo.isCompleted}
                  onChange={() => handleCompleteTodo(todo.id)}
                  className="mt-1"
                />
                <div>
                  <h3 className={`font-medium ${
                    todo.isCompleted ? 'line-through text-gray-500' : ''
                  }`}>
                    {todo.title}
                  </h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {todo.scheduledTime}
                    </div>
                    {todo.isFromGoal && (
                      <span className="text-blue-500">목표 연결됨</span>
                    )}
                  </div>
                  {todo.note && (
                    <p className="mt-2 text-sm text-gray-600">{todo.note}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!todo.isFromGoal && (
                  <>
                    <button
                      onClick={() => handleEditTodo(todo)}
                      className="p-2 text-gray-600 hover:text-blue-600 rounded-full hover:bg-gray-100"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTodo(todo.id)}
                      className="p-2 text-gray-600 hover:text-red-600 rounded-full hover:bg-gray-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                {todo.isCompleted && todo.actualCompletionTime && (
                  <span className="text-sm text-gray-500">
                    완료: {new Date(todo.actualCompletionTime).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        {todosForSelectedDate.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            해당 날짜에 예정된 일정이 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}