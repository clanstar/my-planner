import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { generateTodosFromGoal } from '../utils/dateUtils';
import { Goal, Todo, DiaryEntry, CompletedTask } from '../types/planner';
import { useAuth } from '../hooks/useAuth';
import { useFirestore } from '../hooks/useFirestore';

// 상수 정의를 별도 섹션으로 분리
const LOCAL_STORAGE_KEYS = {
  GOALS: 'planner_goals',
  TODOS: 'planner_todos',
  DIARY: 'planner_diary',
  COMPLETED_TASKS: 'planner_completed_tasks',
  SYNCED_WITH_FIRESTORE: 'planner_synced_with_firestore',
  SYNC_RETRY_COUNT: 'planner_sync_retry_count',
  LAST_SYNC_ATTEMPT: 'planner_last_sync_attempt'
} as const;

// 생성된 할 일 청크 처리를 위한 상수
const CHUNK_SIZE = 100; // 한 번에 처리할 할 일 수
const CHUNK_DELAY = 10; // 청크 사이의 지연 시간(ms)
const MAX_SYNC_RETRIES = 3; // 최대 동기화 재시도 횟수
const SYNC_RETRY_DELAY = 60000; // 동기화 재시도 간격(ms) - 1분

// 컨텍스트 타입 정의 - 컴포넌트 외부에 배치하여 import 가능
interface PlannerContextType {
  goals: Goal[];
  todos: Todo[];
  diaryEntries: DiaryEntry[];
  completedTasks: CompletedTask[];
  addGoal: (goal: Goal) => Promise<void>;
  updateGoal: (goal: Goal) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  addTodo: (todo: Todo) => Promise<void>;
  updateTodo: (todo: Todo) => Promise<void>;
  deleteTodo: (todoId: string) => Promise<void>;
  addDiaryEntry: (entry: DiaryEntry) => Promise<void>;
  updateDiaryEntry: (entry: DiaryEntry) => Promise<void>;
  deleteDiaryEntry: (entryId: string) => Promise<void>;
  loading: boolean;
  error: Error | null;
  syncStatus: 'idle' | 'syncing' | 'error' | 'success';
  syncWithFirestore: () => Promise<boolean>;
  retrySync: () => Promise<boolean>;
  clearError: () => void;
}

export const PlannerContext = createContext<PlannerContextType | undefined>(undefined);

// 유틸리티 함수
const getLocalStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return defaultValue;
  }
};

const setLocalStorage = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing to localStorage (${key}):`, error);
  }
};

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  // 인증 및 Firestore 훅 사용
  const { currentUser } = useAuth();
  const firestore = useFirestore();
  
  // 로딩 및 에러 상태
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');
  
  // 동기화 상태 추적
  const [syncedWithFirestore, setSyncedWithFirestore] = useState<boolean>(() => 
    getLocalStorage(LOCAL_STORAGE_KEYS.SYNCED_WITH_FIRESTORE, false)
  );
  
  // 상태 초기화
  const [goals, setGoals] = useState<Goal[]>(() => 
    getLocalStorage(LOCAL_STORAGE_KEYS.GOALS, [])
  );

  const [todos, setTodos] = useState<Todo[]>(() => {
    const savedTodos = getLocalStorage<Todo[]>(LOCAL_STORAGE_KEYS.TODOS, []);
    // 손상된 데이터 필터링
    return savedTodos.filter(todo => 
      todo && 
      typeof todo === 'object' && 
      Object.keys(todo).length > 0 && 
      todo.id && 
      todo.title
    );
  });

  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>(() => 
    getLocalStorage(LOCAL_STORAGE_KEYS.DIARY, [])
  );

  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>(() => 
    getLocalStorage(LOCAL_STORAGE_KEYS.COMPLETED_TASKS, [])
  );

  // 동기화 상태 및 할 일 생성 추적을 위한 ref
  const isProcessingRef = useRef<boolean>(false);
  const isSyncingRef = useRef<boolean>(false);
  const hasPendingChangesRef = useRef<boolean>(false);
  const goalsTodosMap = useRef<Map<string, Todo[]>>(new Map());

  // 중복 코드 제거를 위한 공통 에러 처리 함수
  const handleError = useCallback((error: unknown, errorMessage: string) => {
    console.error(errorMessage, error);
    const finalError = error instanceof Error ? error : new Error(errorMessage);
    setError(finalError);
    return finalError;
  }, []);

  // 할당량 초과 처리 함수
  const handleQuotaExceeded = useCallback((error: unknown) => {
    if (error instanceof Error && 
        (error.message.includes('quota') || 
         error.message.includes('resource has been exhausted'))) {
      // 할당량 초과 시 로컬 스토리지만 사용하도록 설정
      setLocalStorage(LOCAL_STORAGE_KEYS.SYNCED_WITH_FIRESTORE, false);
      setSyncedWithFirestore(false);
      setSyncStatus('error');
      
      // 사용자에게 알림
      alert('Firebase 할당량이 초과되었습니다. 오프라인 모드로 전환합니다.');
      return true;
    }
    return false;
  }, []);

  // 동기화 재시도 함수
  const retrySync = useCallback(async () => {
    if (!currentUser || isSyncingRef.current) return false;
    
    const retryCount = getLocalStorage<number>(LOCAL_STORAGE_KEYS.SYNC_RETRY_COUNT, 0);
    
    if (retryCount >= MAX_SYNC_RETRIES) {
      setError(new Error('동기화 최대 재시도 횟수를 초과했습니다. 나중에 다시 시도해주세요.'));
      return false;
    }
    
    // 재시도 카운트 증가
    setLocalStorage(LOCAL_STORAGE_KEYS.SYNC_RETRY_COUNT, retryCount + 1);
    setLocalStorage(LOCAL_STORAGE_KEYS.LAST_SYNC_ATTEMPT, new Date().getTime());
    
    return await syncWithFirestore();
  }, [currentUser]);

  // 오류 초기화 함수
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Firestore에서 데이터 로드
  const loadDataFromFirestore = useCallback(async () => {
    if (!currentUser || isProcessingRef.current) return;
    
    try {
      isProcessingRef.current = true;
      setLoading(true);
      setError(null);
      setSyncStatus('syncing');
      
      console.log('Firestore에서 데이터 로드 중...');
      
      // 각 데이터 타입별로 Firestore에서 병렬 로드
      const [loadedGoals, loadedTodos, loadedDiaryEntries, loadedCompletedTasks] = await Promise.all([
        firestore.getGoals(),
        firestore.getTodos(),
        firestore.getDiaryEntries(),
        firestore.getCompletedTasks()
      ]);
      
      // 중복 ID 검사 로직 추가
      const uniqueGoals = removeDuplicateById(loadedGoals);
      const uniqueTodos = removeDuplicateById(loadedTodos);
      const uniqueDiaryEntries = removeDuplicateById(loadedDiaryEntries);
      const uniqueCompletedTasks = removeDuplicateById(loadedCompletedTasks);
      
      // 상태 업데이트 및 로컬 스토리지 저장 (배치로 처리)
      setGoals(uniqueGoals);
      setTodos(uniqueTodos);
      setDiaryEntries(uniqueDiaryEntries);
      setCompletedTasks(uniqueCompletedTasks);
      
      // 한 번에 로컬 스토리지 업데이트
      setLocalStorage(LOCAL_STORAGE_KEYS.GOALS, uniqueGoals);
      setLocalStorage(LOCAL_STORAGE_KEYS.TODOS, uniqueTodos);
      setLocalStorage(LOCAL_STORAGE_KEYS.DIARY, uniqueDiaryEntries);
      setLocalStorage(LOCAL_STORAGE_KEYS.COMPLETED_TASKS, uniqueCompletedTasks);
      
      // 동기화 완료 표시
      setLocalStorage(LOCAL_STORAGE_KEYS.SYNCED_WITH_FIRESTORE, true);
      setLocalStorage(LOCAL_STORAGE_KEYS.SYNC_RETRY_COUNT, 0); // 재시도 카운터 초기화
      setSyncedWithFirestore(true);
      setSyncStatus('success');
      
      console.log('Firestore에서 데이터 로드 완료');
    } catch (error) {
      console.error('데이터 로드 오류:', error);
      setSyncStatus('error');
      
      handleError(error, '데이터 로드 중 오류가 발생했습니다.');
      
      // 할당량 초과가 아닌 경우에만 재시도 설정
      if (!handleQuotaExceeded(error)) {
        // 다음 동기화 재시도 시간 설정
        setLocalStorage(LOCAL_STORAGE_KEYS.LAST_SYNC_ATTEMPT, new Date().getTime());
      }
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  }, [currentUser, firestore, handleError, handleQuotaExceeded]);

  // 3. 중복 ID 제거 유틸리티 함수 추가
  function removeDuplicateById<T extends { id: string }>(items: T[]): T[] {
    const seen = new Set<string>();
    return items.filter(item => {
      const isDuplicate = seen.has(item.id);
      seen.add(item.id);
      return !isDuplicate;
    });
  }
  
  // 로컬 데이터를 Firestore로 마이그레이션
  const syncWithFirestore = useCallback(async () => {
    if (!currentUser || isSyncingRef.current) return false;
    
    try {
      isSyncingRef.current = true;
      setLoading(true);
      setError(null);
      setSyncStatus('syncing');
      
      await firestore.migrateLocalDataToFirestore({
        goals,
        todos,
        diaryEntries,
        completedTasks
      });
      
      // 동기화 완료 표시
      setLocalStorage(LOCAL_STORAGE_KEYS.SYNCED_WITH_FIRESTORE, true);
      setLocalStorage(LOCAL_STORAGE_KEYS.SYNC_RETRY_COUNT, 0); // 재시도 카운터 초기화
      setSyncedWithFirestore(true);
      setSyncStatus('success');
      
      setLoading(false);
      isSyncingRef.current = false;
      return true;
    } catch (error) {
      console.error('데이터 동기화 오류:', error);
      setSyncStatus('error');
      
      handleError(error, '데이터 동기화 중 오류가 발생했습니다.');
      
      if (!handleQuotaExceeded(error)) {
        const retryCount = getLocalStorage<number>(LOCAL_STORAGE_KEYS.SYNC_RETRY_COUNT, 0);
        setLocalStorage(LOCAL_STORAGE_KEYS.SYNC_RETRY_COUNT, retryCount + 1);
        setLocalStorage(LOCAL_STORAGE_KEYS.LAST_SYNC_ATTEMPT, new Date().getTime());
      }
      
      setLoading(false);
      isSyncingRef.current = false;
      return false;
    }
  }, [currentUser, firestore, goals, todos, diaryEntries, completedTasks, handleError, handleQuotaExceeded]);

  // 사용자가 로그인하면 데이터 로드 또는 마이그레이션
  // useRef 훅을 컴포넌트 함수 본문의 최상위 레벨로 이동
  const hasInitializedRef = useRef(false);

  // 사용자가 로그인하면 데이터 로드 또는 마이그레이션
  useEffect(() => {
    // 이미 초기화했으면 중복 실행 방지
    if (hasInitializedRef.current) return;
    
    if (currentUser) {
      hasInitializedRef.current = true;
      
      if (syncedWithFirestore) {
        // 이미 동기화된 경우 Firestore에서 데이터 로드
        loadDataFromFirestore();
      } else {
        // 동기화 재시도 로직
        const lastSyncAttempt = getLocalStorage<number>(LOCAL_STORAGE_KEYS.LAST_SYNC_ATTEMPT, 0);
        const now = new Date().getTime();
        const retryCount = getLocalStorage<number>(LOCAL_STORAGE_KEYS.SYNC_RETRY_COUNT, 0);
        
        // 일정 시간이 지났고 최대 시도 횟수를 초과하지 않았으면 재시도
        if (now - lastSyncAttempt > SYNC_RETRY_DELAY && retryCount < MAX_SYNC_RETRIES) {
          syncWithFirestore();
        }
      }
    }
  }, [currentUser, syncedWithFirestore, loadDataFromFirestore, syncWithFirestore]);

  // 목표에서 할 일 생성을 최적화하는 청크 처리 함수
  const processGoalTodosInChunks = useCallback(async () => {
    if (isProcessingRef.current || goals.length === 0) return;
    
    try {
      isProcessingRef.current = true;
      console.log('목표에서 할 일 생성 시작...');
      
      // 모든 목표의 날짜 범위를 합쳐서 전체 범위 계산
      const today = new Date();
      let minStartDate = today;
      let maxEndDate = today;
      
      goals.forEach(goal => {
        if (goal.startDate && goal.endDate) {
          const startDate = new Date(goal.startDate + 'T00:00:00');
          const endDate = new Date(goal.endDate + 'T00:00:00');
          
          if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            if (startDate < minStartDate) minStartDate = startDate;
            if (endDate > maxEndDate) maxEndDate = endDate;
          }
        }
      });
      
      // 기존 수동 할일들 보존
      const manualTodos = todos.filter(todo => !todo.isFromGoal);
      
      // 기존 목표 연결 할일들의 상태 저장 (완료 상태 등 유지를 위해)
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
      
      // 목표별 할 일 배열 (청크 처리 준비)
      const allGeneratedTodos: Todo[] = [];
      goalsTodosMap.current.clear();
      
      // 각 목표에 대해 할 일 생성 처리
      for (const goal of goals) {
        try {
          if (!goal.startDate || !goal.endDate) continue;
          
          // 현지 시간대 기준으로 날짜 생성
          const startDate = new Date(goal.startDate + 'T00:00:00');
          const endDate = new Date(goal.endDate + 'T00:00:00');
          
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) continue;
          
          const goalTodos = await generateTodosFromGoal(goal, startDate, endDate);
          
          // 기존 상태 복원
          const todosWithState = goalTodos.map(todo => {
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
          
          // 목표별 할 일 맵에 저장 (필요 시 나중에 참조)
          goalsTodosMap.current.set(goal.id, todosWithState);
          
          // 모든 할 일 배열에 추가
          allGeneratedTodos.push(...todosWithState);
        } catch (error) {
          console.error(`목표 ID: ${goal.id} 처리 중 오류:`, error);
        }
      }
      
      // 전체 할 일 목록을 청크 단위로 처리하여 상태 업데이트
      const processChunks = async (chunks: Todo[][], index: number) => {
        if (index >= chunks.length) {
          console.log('모든 할 일 생성 완료');
          isProcessingRef.current = false;
          return;
        }
        
        const currentChunk = chunks[index];
        console.log(`청크 ${index + 1}/${chunks.length} 처리 중 (${currentChunk.length}개 항목)`);
        
        const currentTodos = [...manualTodos, ...chunks.slice(0, index + 1).flat()];
        
        // 상태 업데이트 및 로컬 스토리지 저장
        setTodos(currentTodos);
        
        // 일정 시간 후 다음 청크 처리 (UI 반응성 유지)
        setTimeout(() => {
          processChunks(chunks, index + 1);
        }, CHUNK_DELAY);
      };
      
      // 청크로 나누기
      const chunks: Todo[][] = [];
      for (let i = 0; i < allGeneratedTodos.length; i += CHUNK_SIZE) {
        chunks.push(allGeneratedTodos.slice(i, i + CHUNK_SIZE));
      }
      
      // 청크가 없으면 빈 할 일 목록으로 설정
      if (chunks.length === 0) {
        setTodos(manualTodos);
        setLocalStorage(LOCAL_STORAGE_KEYS.TODOS, manualTodos);
        isProcessingRef.current = false;
      } else {
        // 청크 처리 시작
        processChunks(chunks, 0);
      }
      
    } catch (error) {
      console.error('할 일 생성 중 오류:', error);
      isProcessingRef.current = false;
      handleError(error, '할 일 생성 중 오류가 발생했습니다.');
    }
  }, [goals, todos, handleError]);

  // 목표 변경 시 할 일 생성 처리
  useEffect(() => {
    if (goals.length > 0 && !isProcessingRef.current) {
      processGoalTodosInChunks();
    }
  }, [goals, processGoalTodosInChunks]);

  // 할 일 변경 시 로컬 스토리지 저장
  useEffect(() => {
    if (hasPendingChangesRef.current) {
      const saveTimer = setTimeout(() => {
        setLocalStorage(LOCAL_STORAGE_KEYS.TODOS, todos);
      }, 500);
      
      return () => clearTimeout(saveTimer);
    }
  }, [todos]);

  // 다이어리 항목 변경 시 로컬 스토리지 저장
  useEffect(() => {
    if (hasPendingChangesRef.current) {
      const saveTimer = setTimeout(() => {
        setLocalStorage(LOCAL_STORAGE_KEYS.DIARY, diaryEntries);
      }, 500);
      
      return () => clearTimeout(saveTimer);
    }
  }, [diaryEntries]);

  // 완료된 작업 변경 시 로컬 스토리지 저장
  useEffect(() => {
    if (hasPendingChangesRef.current) {
      const saveTimer = setTimeout(() => {
        setLocalStorage(LOCAL_STORAGE_KEYS.COMPLETED_TASKS, completedTasks);
      }, 500);
      
      return () => clearTimeout(saveTimer);
    }
  }, [completedTasks]);

  // 목표 추가 함수
  const addGoal = useCallback(async (goal: Goal) => {
    try {
      setLoading(true);
      hasPendingChangesRef.current = true;
      
      // 먼저 같은 ID가 이미 있는지 확인
      const duplicateIndex = goals.findIndex(g => g.id === goal.id);
      if (duplicateIndex >= 0) {
        // 중복 ID가 있다면 새 ID 생성
        goal = {
          ...goal,
          id: crypto.randomUUID()
        };
      }
      
      // Firestore에 저장 (인증된 사용자인 경우)
      let finalGoal = {...goal};
      if (currentUser && syncedWithFirestore) {
        try {
          const goalId = await firestore.createGoal(goal);
          console.log('Firestore에 목표 저장됨, ID:', goalId);
          if (goalId && goalId !== goal.id) {
            finalGoal = {...goal, id: goalId};
          }
        } catch (error) {
          handleError(error, 'Firestore에 목표 저장 실패');
          if (handleQuotaExceeded(error)) {
            // 할당량 초과 시 로컬에만 저장하고 계속 진행
            console.warn('Firebase 할당량 초과, 로컬에만 저장');
          } else {
            throw error; // 다른 오류는 상위로 전파
          }
        }
      }
      
      // 로컬 상태 업데이트
      setGoals(prev => {
        const newGoals = [...prev, finalGoal];
        // 로컬 스토리지 저장 (State 업데이트와 함께 호출하여 동기화 유지)
        setLocalStorage(LOCAL_STORAGE_KEYS.GOALS, newGoals);
        return newGoals;
      });
      
    } catch (error) {
      handleError(error, '목표 추가 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, syncedWithFirestore, firestore, goals, handleError, handleQuotaExceeded]);

  const updateGoal = useCallback(async (updatedGoal: Goal) => {
    try {
      setLoading(true);
      hasPendingChangesRef.current = true;
      
      // 로컬 상태 업데이트
      setGoals(prev => {
        const newGoals = prev.map(goal => goal.id === updatedGoal.id ? updatedGoal : goal);
        setLocalStorage(LOCAL_STORAGE_KEYS.GOALS, newGoals);
        return newGoals;
      });
      
      // Firestore에도 업데이트 (인증된 사용자인 경우)
      if (currentUser && syncedWithFirestore) {
        try {
          await firestore.updateGoal(updatedGoal.id, updatedGoal);
        } catch (error) {
          // Firebase 오류는 로깅하지만 로컬 상태는 이미 업데이트되었으므로 UI에는 영향 없음
          console.error('Firestore 목표 업데이트 오류:', error);
          handleQuotaExceeded(error);
        }
      }
      
      // 목표 관련 할 일 생성을 위해 처리 플래그 리셋
      // 비동기적으로 처리되므로 이미 완료된 업데이트에 영향을 주지 않음
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 100);
      
    } catch (error) {
      handleError(error, '목표 업데이트 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, syncedWithFirestore, firestore, handleError, handleQuotaExceeded]);

  const deleteGoal = useCallback(async (goalId: string) => {
    try {
      setLoading(true);
      hasPendingChangesRef.current = true;
      
      // 관련된 할 일 및 목표 상태 업데이트
      const goalToDelete = goals.find(g => g.id === goalId);
      if (!goalToDelete) {
        throw new Error('삭제할 목표를 찾을 수 없습니다.');
      }
      
      // 로컬 상태 일괄 업데이트 (목표, 할 일, 완료된 작업)
      // 비동기 작업 병렬 처리
      await Promise.all([
        // 목표 상태 업데이트
        new Promise<void>(resolve => {
          setGoals(prev => {
            const newGoals = prev.filter(goal => goal.id !== goalId);
            setLocalStorage(LOCAL_STORAGE_KEYS.GOALS, newGoals);
            resolve();
            return newGoals;
          });
        }),
        
        // 할 일 상태 업데이트
        new Promise<void>(resolve => {
          setTodos(prev => {
            const newTodos = prev.filter(todo => todo.goalId !== goalId);
            setLocalStorage(LOCAL_STORAGE_KEYS.TODOS, newTodos);
            resolve();
            return newTodos;
          });
        }),
        
        // 완료된 작업 상태 업데이트
        new Promise<void>(resolve => {
          setCompletedTasks(prev => {
            const newTasks = prev.filter(task => task.goalId !== goalId);
            setLocalStorage(LOCAL_STORAGE_KEYS.COMPLETED_TASKS, newTasks);
            resolve();
            return newTasks;
          });
        })
      ]);
      
      // Firestore에서도 삭제 (인증된 사용자인 경우)
      if (currentUser && syncedWithFirestore) {
        try {
          await firestore.deleteGoal(goalId);
        } catch (error) {
          console.error('Firestore 목표 삭제 오류:', error);
          handleQuotaExceeded(error);
        }
      }
      
      // 목표 관련 캐시 제거
      goalsTodosMap.current.delete(goalId);
      
    } catch (error) {
      handleError(error, '목표 삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, syncedWithFirestore, firestore, goals, handleError, handleQuotaExceeded]);

  // 할 일 관련 CRUD 함수
  const addTodo = useCallback(async (todo: Todo) => {
    try {
      setLoading(true);
      hasPendingChangesRef.current = true;
      
      // Firestore에 저장 (인증된 사용자인 경우)
      let finalTodo = {...todo};
      if (currentUser && syncedWithFirestore) {
        try {
          const todoId = await firestore.createTodo(todo);
          if (todoId && todoId !== todo.id) {
            finalTodo = {...todo, id: todoId};
          }
        } catch (error) {
          console.error('Firestore 할 일 저장 오류:', error);
          if (handleQuotaExceeded(error)) {
            // 할당량 초과 시 로컬에만 저장하고 계속 진행
          } else {
            throw error;
          }
        }
      }
      
      // 로컬 상태 업데이트
      setTodos(prev => {
        const newTodos = [...prev, finalTodo];
        setLocalStorage(LOCAL_STORAGE_KEYS.TODOS, newTodos);
        return newTodos;
      });
      
    } catch (error) {
      handleError(error, '할 일 추가 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, syncedWithFirestore, firestore, handleError, handleQuotaExceeded]);

  // 할 일 업데이트 및 완료 처리를 위한 유틸리티 함수
  const handleCompletedTask = useCallback(async (todo: Todo, isComplete: boolean) => {
    if (!todo.goalId) return null;
    
    try {
      const goal = goals.find(g => g.id === todo.goalId);
      if (!goal) return null;
      
      if (isComplete) {
        // 완료 처리
        const completedTask: CompletedTask = {
          id: todo.id,
          goalId: todo.goalId,
          completedDate: new Date().toISOString(),
          scheduledDate: todo.scheduledDate,
          type: goal.type || 'daily'
        };
        
        // 이미 완료된 작업이 있는지 확인
        const taskExists = completedTasks.some(task => task.id === todo.id);
        if (!taskExists) {
          // 로컬 상태 업데이트
          setCompletedTasks(prev => {
            const newTasks = [...prev, completedTask];
            setLocalStorage(LOCAL_STORAGE_KEYS.COMPLETED_TASKS, newTasks);
            return newTasks;
          });
          
          // Firestore 저장 (별도 스레드로 처리)
          if (currentUser && syncedWithFirestore) {
            try {
              // 먼저 문서가 존재하는지 확인 (문서 생성 전에)
              const exists = await firestore.checkTodoExists(todo.id);
              if (exists) {
                await firestore.createCompletedTask(completedTask);
              } else {
                console.log(`Todo ID: ${todo.id}가 Firestore에 없어 완료 작업을 생성하지 않습니다.`);
              }
            } catch (error) {
              console.error('Firestore 완료 작업 저장 오류:', error);
              handleQuotaExceeded(error);
            }
          }
          
          return completedTask;
        }
      } else {
        // 완료 취소 처리
        setCompletedTasks(prev => {
          const newTasks = prev.filter(task => task.id !== todo.id);
          setLocalStorage(LOCAL_STORAGE_KEYS.COMPLETED_TASKS, newTasks);
          return newTasks;
        });
        
        // Firestore에서도 삭제
        if (currentUser && syncedWithFirestore) {
          try {
            // 완료된 작업이 존재하는지 먼저 확인
            const exists = await firestore.checkCompletedTaskExists(todo.id);
            if (exists) {
              await firestore.deleteCompletedTask(todo.id);
            } else {
              console.log(`CompletedTask ID: ${todo.id}가 Firestore에 없어 삭제를 건너뜁니다.`);
            }
          } catch (error) {
            console.error('Firestore 완료 작업 삭제 오류:', error);
            handleQuotaExceeded(error);
          }
        }
      }
    } catch (error) {
      console.error('할 일 완료 처리 오류:', error);
    }
    
    return null;
  }, [currentUser, syncedWithFirestore, firestore, goals, completedTasks, handleQuotaExceeded]);

  // updateTodo 함수도 수정
  const updateTodo = useCallback(async (updatedTodo: Todo) => {
    try {
      setLoading(true);
      hasPendingChangesRef.current = true;
      
      // 완료 상태 변경 확인
      const existingTodo = todos.find(t => t.id === updatedTodo.id);
      const completionStatusChanged = existingTodo && 
        existingTodo.isCompleted !== updatedTodo.isCompleted;
      
      // 로컬 상태 업데이트
      setTodos(prev => {
        const newTodos = prev.map(todo => todo.id === updatedTodo.id ? updatedTodo : todo);
        setLocalStorage(LOCAL_STORAGE_KEYS.TODOS, newTodos);
        return newTodos;
      });
      
      // 완료 상태 변경 시 완료 작업 처리
      if (completionStatusChanged && updatedTodo.goalId) {
        await handleCompletedTask(updatedTodo, updatedTodo.isCompleted);
      }
      
      // Firestore 업데이트 (별도 스레드로 처리)
      if (currentUser && syncedWithFirestore) {
        try {
          // 먼저 문서가 존재하는지 확인
          const exists = await firestore.checkTodoExists(updatedTodo.id);
          
          if (exists) {
            // undefined 값 처리를 위한 객체 변환
            const todoForFirestore = Object.entries(updatedTodo).reduce((acc, [key, value]) => {
              if (value !== undefined) {
                acc[key] = value;
              }
              return acc;
            }, {} as Record<string, any>);
            
            await firestore.updateTodo(updatedTodo.id, todoForFirestore);
          } else {
            // 문서가 없으면 생성
            console.log(`Todo ID: ${updatedTodo.id}가 Firestore에 없어 생성합니다.`);
            await firestore.createTodo(updatedTodo);
          }
        } catch (error) {
          console.error('Firestore 할 일 업데이트 오류:', error);
          handleQuotaExceeded(error);
        }
      }
      
    } catch (error) {
      handleError(error, '할 일 업데이트 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, syncedWithFirestore, firestore, todos, handleCompletedTask, handleError, handleQuotaExceeded]);

  const deleteTodo = useCallback(async (todoId: string) => {
    try {
      setLoading(true);
      hasPendingChangesRef.current = true;
      
      // 삭제할 할 일 정보 저장
      const todoToDelete = todos.find(t => t.id === todoId);
      
      // 로컬 상태 업데이트
      setTodos(prev => {
        const newTodos = prev.filter(todo => todo.id !== todoId);
        setLocalStorage(LOCAL_STORAGE_KEYS.TODOS, newTodos);
        return newTodos;
      });
      
      // 완료된 작업도 삭제
      setCompletedTasks(prev => {
        const newTasks = prev.filter(task => task.id !== todoId);
        setLocalStorage(LOCAL_STORAGE_KEYS.COMPLETED_TASKS, newTasks);
        return newTasks;
      });
      
      // Firestore에서도 삭제 (병렬 처리)
      if (currentUser && syncedWithFirestore && todoToDelete) {
        try {
          await Promise.all([
            firestore.deleteTodo(todoId),
            // 목표 연결 할 일인 경우 완료 작업도 삭제
            todoToDelete.goalId ? firestore.deleteCompletedTask(todoId) : Promise.resolve()
          ]);
        } catch (error) {
          console.error('Firestore 할 일 삭제 오류:', error);
          handleQuotaExceeded(error);
        }
      }
      
    } catch (error) {
      handleError(error, '할 일 삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, syncedWithFirestore, firestore, todos, handleError, handleQuotaExceeded]);

  // 다이어리 관련 CRUD 함수
  const addDiaryEntry = useCallback(async (entry: DiaryEntry) => {
    try {
      setLoading(true);
      hasPendingChangesRef.current = true;
      
      // 같은 날짜 항목이 있는지 확인
      const existingEntryIndex = diaryEntries.findIndex(e => e.date === entry.date);
      
      // 로컬 상태 업데이트
      setDiaryEntries(prev => {
        let newEntries;
        
        if (existingEntryIndex !== -1) {
          // 기존 항목 업데이트
          newEntries = [...prev];
          newEntries[existingEntryIndex] = entry;
        } else {
          // 새 항목 추가
          newEntries = [...prev, entry];
        }
        
        setLocalStorage(LOCAL_STORAGE_KEYS.DIARY, newEntries);
        return newEntries;
      });
      
      // Firestore에도 저장 (인증된 사용자인 경우)
      if (currentUser && syncedWithFirestore) {
        try {
          await firestore.createDiaryEntry(entry);
        } catch (error) {
          console.error('Firestore 다이어리 항목 저장 오류:', error);
          handleQuotaExceeded(error);
        }
      }
      
    } catch (error) {
      handleError(error, '다이어리 항목 추가 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, syncedWithFirestore, firestore, diaryEntries, handleError, handleQuotaExceeded]);

  const updateDiaryEntry = useCallback(async (updatedEntry: DiaryEntry) => {
    try {
      setLoading(true);
      hasPendingChangesRef.current = true;
      
      // 로컬 상태 업데이트
      setDiaryEntries(prev => {
        const newEntries = prev.map(entry => entry.id === updatedEntry.id ? updatedEntry : entry);
        setLocalStorage(LOCAL_STORAGE_KEYS.DIARY, newEntries);
        return newEntries;
      });
      
      // Firestore에도 업데이트 (인증된 사용자인 경우)
      if (currentUser && syncedWithFirestore) {
        try {
          await firestore.updateDiaryEntry(updatedEntry.id, updatedEntry);
        } catch (error) {
          console.error('Firestore 다이어리 항목 업데이트 오류:', error);
          handleQuotaExceeded(error);
        }
      }
      
    } catch (error) {
      handleError(error, '다이어리 항목 업데이트 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, syncedWithFirestore, firestore, handleError, handleQuotaExceeded]);

  const deleteDiaryEntry = useCallback(async (entryId: string) => {
    try {
      setLoading(true);
      hasPendingChangesRef.current = true;
      
      // 로컬 상태 업데이트
      setDiaryEntries(prev => {
        const newEntries = prev.filter(entry => entry.id !== entryId);
        setLocalStorage(LOCAL_STORAGE_KEYS.DIARY, newEntries);
        return newEntries;
      });
      
      // Firestore에서도 삭제 (인증된 사용자인 경우)
      if (currentUser && syncedWithFirestore) {
        try {
          await firestore.deleteDiaryEntry(entryId);
        } catch (error) {
          console.error('Firestore 다이어리 항목 삭제 오류:', error);
          handleQuotaExceeded(error);
        }
      }
      
    } catch (error) {
      handleError(error, '다이어리 항목 삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, syncedWithFirestore, firestore, handleError, handleQuotaExceeded]);

  // 컴포넌트 마운트/언마운트 효과
  useEffect(() => {
    // 마운트 시 초기화
    hasPendingChangesRef.current = true;
    
    return () => {
      // 언마운트 시 정리
      hasPendingChangesRef.current = false;
      isProcessingRef.current = false;
      isSyncingRef.current = false;
    };
  }, []);

  // 주기적인 Firestore 동기화 검사 (오류 발생 시 재시도)
  useEffect(() => {
    if (!currentUser || syncedWithFirestore) return;
  
    let isMounted = true;
    const checkSyncInterval = setInterval(() => {
      if (!isMounted) return;
      
      const lastSyncAttempt = getLocalStorage<number>(LOCAL_STORAGE_KEYS.LAST_SYNC_ATTEMPT, 0);
      const now = new Date().getTime();
      const retryCount = getLocalStorage<number>(LOCAL_STORAGE_KEYS.SYNC_RETRY_COUNT, 0);
      
      // 일정 시간이 지났고 최대 시도 횟수를 초과하지 않았으면 재시도
      if (!isSyncingRef.current && 
          now - lastSyncAttempt > SYNC_RETRY_DELAY && 
          retryCount < MAX_SYNC_RETRIES) {
        syncWithFirestore();
      }
    }, SYNC_RETRY_DELAY);
    
    return () => {
      isMounted = false;
      clearInterval(checkSyncInterval);
    };
  }, [currentUser, syncedWithFirestore, syncWithFirestore]);

  // 컨텍스트 값 생성
  const value: PlannerContextType = {
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
    loading,
    error,
    syncStatus,
    syncWithFirestore,
    retrySync,
    clearError
  };

  return (
    <PlannerContext.Provider value={value}>
      {children}
    </PlannerContext.Provider>
  );
}

// 커스텀 훅
export function usePlanner() {
  const context = useContext(PlannerContext);
  if (context === undefined) {
    throw new Error('usePlanner는 PlannerProvider 내에서 사용해야 합니다');
  }
  return context;
}