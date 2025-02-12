import React, { createContext, useContext, useState, useEffect } from 'react';
import { generateTodosFromGoal } from '../utils/dateUtils';
import { Goal, Todo, DiaryEntry, CompletedTask } from '../types/planner';

interface PlannerContextType {
  goals: Goal[];
  todos: Todo[];
  diaryEntries: DiaryEntry[];
  completedTasks: CompletedTask[];
  addGoal: (goal: Goal) => void;
  updateGoal: (goal: Goal) => void;
  deleteGoal: (goalId: string) => void;
  addTodo: (todo: Todo) => void;
  updateTodo: (todo: Todo) => void;
  deleteTodo: (todoId: string) => void;
  addDiaryEntry: (entry: DiaryEntry) => void;
  updateDiaryEntry: (entry: DiaryEntry) => void;
  deleteDiaryEntry: (entryId: string) => void;
}

export const PlannerContext = createContext<PlannerContextType | undefined>(undefined);

const LOCAL_STORAGE_KEYS = {
  GOALS: 'planner_goals',
  TODOS: 'planner_todos',
  DIARY: 'planner_diary',
  COMPLETED_TASKS: 'planner_completed_tasks'
} as const;

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  // State initialization with localStorage
  const [goals, setGoals] = useState<Goal[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.GOALS);
    return saved ? JSON.parse(saved) : [];
  });

  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.TODOS);
    if (!saved) return [];
    const parsedTodos = JSON.parse(saved);
    return parsedTodos.filter((todo: Todo) => 
      todo && Object.keys(todo).length > 0 && todo.id && todo.title
    );
  });

  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.DIARY);
    return saved ? JSON.parse(saved) : [];
  });

  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.COMPLETED_TASKS);
    return saved ? JSON.parse(saved) : [];
  });

  // LocalStorage effect hooks
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.GOALS, JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.TODOS, JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.DIARY, JSON.stringify(diaryEntries));
  }, [diaryEntries]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.COMPLETED_TASKS, JSON.stringify(completedTasks));
  }, [completedTasks]);

  useEffect(() => {
    const generateAndSetTodos = async () => {
      try {
        console.log('Starting todo generation for goals:', goals);
  
        // 기존 수동 할일들 보존
        const manualTodos = todos.filter(todo => !todo.isFromGoal);
        
        // 기존 목표 연결 할일들의 상태 저장
        const existingTodoStates = todos
          .filter(todo => todo.isFromGoal)
          .reduce((acc, todo) => {
            const key = `${todo.goalId}-${todo.scheduledDate}`;
            acc[key] = {
              isCompleted: todo.isCompleted,
              actualCompletionTime: todo.actualCompletionTime
            };
            return acc;
          }, {} as Record<string, { isCompleted: boolean; actualCompletionTime?: string }>);
  
        // 각 목표에 대한 새로운 할일 생성
        const generatedTodosPromises = goals.map(async (goal) => {
          try {
            if (!goal.startDate || !goal.endDate) {
              console.warn('Goal missing dates:', goal);
              return [];
            }
  
            const startDate = new Date(goal.startDate);
            const endDate = new Date(goal.endDate);
  
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              console.warn('Invalid dates for goal:', goal);
              return [];
            }
  
            const todos = await generateTodosFromGoal(
              goal,
              startDate,
              endDate,
            );
  
            // 기존 상태 복원
            return todos.map(todo => {
              const key = `${todo.goalId}-${todo.scheduledDate}`;
              const existingState = existingTodoStates[key];
              
              if (existingState) {
                return {
                  ...todo,
                  isCompleted: existingState.isCompleted,
                  actualCompletionTime: existingState.actualCompletionTime
                };
              }
              return todo;
            });
          } catch (error) {
            console.error(`Error generating todos for goal ${goal.title}:`, error);
            return [];
          }
        });
  
        const generatedTodoArrays = await Promise.all(generatedTodosPromises);
        const allGeneratedTodos = generatedTodoArrays.flat();
  
        console.log('Generated todos:', allGeneratedTodos);
  
        // 최종 할일 목록 설정
        setTodos([...manualTodos, ...allGeneratedTodos]);
  
      } catch (error) {
        console.error('Error in generateAndSetTodos:', error);
      }
    };
  
    generateAndSetTodos();
  }, [goals]);

  // Goals CRUD operations
  const addGoal = (goal: Goal) => {
    console.log('addGoal', goal);
    setGoals(prev => [...prev, goal]);
  };

  const updateGoal = (updatedGoal: Goal) => {
    setGoals(prev => prev.map(goal => 
      goal.id === updatedGoal.id ? updatedGoal : goal
    ));
  };

  const deleteGoal = (goalId: string) => {
    setGoals(prev => prev.filter(goal => goal.id !== goalId));
    // 관련된 할 일들도 함께 삭제
    setTodos(prev => prev.filter(todo => todo.goalId !== goalId));
    // 완료된 작업 기록도 삭제
    setCompletedTasks(prev => prev.filter(task => task.goalId !== goalId));
  };

  // Todos CRUD operations
  const addTodo = (todo: Todo) => {
    setTodos(prev => [...prev, todo]);
  };

  const updateTodo = (updatedTodo: Todo) => {
    setTodos(prev => {
      const newTodos = prev.map(todo => {
        if (todo.id === updatedTodo.id) {
          return updatedTodo;
        }
        return todo;
      });
      // localStorage에 즉시 저장
      localStorage.setItem(LOCAL_STORAGE_KEYS.TODOS, JSON.stringify(newTodos));
      return newTodos;
    });
  
    // 목표 연결된 할일인 경우 completedTasks 업데이트
    if (updatedTodo.goalId && updatedTodo.isCompleted) {
      const completedTask: CompletedTask = {
        id: updatedTodo.id,
        goalId: updatedTodo.goalId,
        completedDate: new Date().toISOString(),
        scheduledDate: updatedTodo.scheduledDate,
        type: goals.find(g => g.id === updatedTodo.goalId)?.type || 'daily'
      };
      setCompletedTasks(prev => [...prev, completedTask]);
    } else if (updatedTodo.goalId && !updatedTodo.isCompleted) {
      setCompletedTasks(prev => prev.filter(task => task.id !== updatedTodo.id));
    }
  };

  const deleteTodo = (todoId: string) => {
    setTodos(prev => prev.filter(todo => todo.id !== todoId));
    // 완료된 작업 기록도 삭제
    setCompletedTasks(prev => prev.filter(task => task.id !== todoId));
  };

  // Diary CRUD operations
  const addDiaryEntry = (entry: DiaryEntry) => {
    setDiaryEntries(prev => {
      const filtered = prev.filter(e => e.date !== entry.date);
      return [...filtered, entry];
    });
  };

  const updateDiaryEntry = (updatedEntry: DiaryEntry) => {
    setDiaryEntries(prev =>
      prev.map(entry => (entry.id === updatedEntry.id ? updatedEntry : entry))
    );
  };

  const deleteDiaryEntry = (entryId: string) => {
    setDiaryEntries(prev => prev.filter(entry => entry.id !== entryId));
  };

  const value = {
    goals,
    todos,
    diaryEntries,
    completedTasks,
    addGoal,
    updateGoal,
    deleteGoal,
    addTodo,
    updateTodo,
    deleteTodo,
    addDiaryEntry,
    updateDiaryEntry,
    deleteDiaryEntry,
  };

  return (
    <PlannerContext.Provider value={value}>
      {children}
    </PlannerContext.Provider>
  );
}

export function usePlanner() {
  const context = useContext(PlannerContext);
  console.log('PlannerContext value:', context); // 디버깅용
  if (context === undefined) {
    throw new Error('usePlanner must be used within a PlannerProvider');
  }
  return context;
}