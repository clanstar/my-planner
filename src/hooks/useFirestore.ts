import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import * as firestoreService from '../services/firestoreService';
import { Goal, Todo, DiaryEntry, CompletedTask } from '../types/planner';

export function useFirestore() {
  const { currentUser: user } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // 에러 핸들링 유틸리티 함수
  const handleError = useCallback((error: unknown, customMessage: string) => {
    console.error(customMessage, error);
    
    // Firestore 인덱스 관련 오류 감지
    if (error instanceof Error && error.message.includes('index')) {
      setError(new Error(
        `${customMessage} - 인덱스가 필요합니다. Firebase 콘솔에서 인덱스를 생성해주세요.`
      ));
    } else {
      setError(error instanceof Error ? error : new Error(customMessage));
    }
    
    setLoading(false);
  }, []);

  // 목표 관련 훅 함수
  const createGoal = useCallback(async (goal: Goal) => {
    if (!user) return null;
    setLoading(true);
    setError(null);
    try {
      const goalId = await firestoreService.createGoal(user.uid, goal);
      setLoading(false);
      return goalId;
    } catch (error) {
      handleError(error, '목표 생성 중 오류가 발생했습니다.');
      return null;
    }
  }, [user, handleError]);

  const updateGoal = useCallback(async (goalId: string, goalData: Partial<Goal>) => {
    if (!user) return false;
    setLoading(true);
    setError(null);
    try {
      const result = await firestoreService.updateGoal(goalId, goalData);
      setLoading(false);
      return result;
    } catch (error) {
      handleError(error, '목표 업데이트 중 오류가 발생했습니다.');
      return false;
    }
  }, [user, handleError]);

  const deleteGoal = useCallback(async (goalId: string) => {
    if (!user) return false;
    setLoading(true);
    setError(null);
    try {
      const result = await firestoreService.deleteGoal(goalId);
      setLoading(false);
      return result;
    } catch (error) {
      handleError(error, '목표 삭제 중 오류가 발생했습니다.');
      return false;
    }
  }, [user, handleError]);

  const getGoals = useCallback(async () => {
    if (!user) return [];
    setLoading(true);
    setError(null);
    try {
      const goals = await firestoreService.getGoals(user.uid);
      setLoading(false);
      return goals;
    } catch (error) {
      handleError(error, '목표 목록 가져오기 중 오류가 발생했습니다.');
      return [];
    }
  }, [user, handleError]);

  // 할 일 관련 훅 함수
  const createTodo = useCallback(async (todo: Todo) => {
    if (!user) return null;
    setLoading(true);
    setError(null);
    try {
      const todoId = await firestoreService.createTodo(user.uid, todo);
      setLoading(false);
      return todoId;
    } catch (error) {
      handleError(error, '할 일 생성 중 오류가 발생했습니다.');
      return null;
    }
  }, [user, handleError]);

  const updateTodo = useCallback(async (todoId: string, todoData: Partial<Todo>) => {
    if (!user) return false;
    setLoading(true);
    setError(null);
    try {
      const result = await firestoreService.updateTodo(todoId, todoData);
      setLoading(false);
      return result;
    } catch (error) {
      handleError(error, '할 일 업데이트 중 오류가 발생했습니다.');
      return false;
    }
  }, [user, handleError]);

  const deleteTodo = useCallback(async (todoId: string) => {
    if (!user) return false;
    setLoading(true);
    setError(null);
    try {
      const result = await firestoreService.deleteTodo(todoId);
      setLoading(false);
      return result;
    } catch (error) {
      handleError(error, '할 일 삭제 중 오류가 발생했습니다.');
      return false;
    }
  }, [user, handleError]);

  const getTodos = useCallback(async () => {
    if (!user) return [];
    setLoading(true);
    setError(null);
    try {
      const todos = await firestoreService.getTodos(user.uid);
      setLoading(false);
      return todos;
    } catch (error) {
      handleError(error, '할 일 목록 가져오기 중 오류가 발생했습니다.');
      return [];
    }
  }, [user, handleError]);

  const getTodosByDateRange = useCallback(async (startDate: string, endDate: string) => {
    if (!user) return [];
    setLoading(true);
    setError(null);
    try {
      const todos = await firestoreService.getTodosByDateRange(user.uid, startDate, endDate);
      setLoading(false);
      return todos;
    } catch (error) {
      handleError(error, '기간별 할 일 목록 가져오기 중 오류가 발생했습니다.');
      return [];
    }
  }, [user, handleError]);

  // 다이어리 관련 훅 함수
  const createDiaryEntry = useCallback(async (entry: DiaryEntry) => {
    if (!user) return null;
    setLoading(true);
    setError(null);
    try {
      const entryId = await firestoreService.createDiaryEntry(user.uid, entry);
      setLoading(false);
      return entryId;
    } catch (error) {
      handleError(error, '다이어리 항목 생성 중 오류가 발생했습니다.');
      return null;
    }
  }, [user, handleError]);

  const updateDiaryEntry = useCallback(async (entryId: string, entryData: Partial<DiaryEntry>) => {
    if (!user) return false;
    setLoading(true);
    setError(null);
    try {
      const result = await firestoreService.updateDiaryEntry(entryId, entryData);
      setLoading(false);
      return result;
    } catch (error) {
      handleError(error, '다이어리 항목 업데이트 중 오류가 발생했습니다.');
      return false;
    }
  }, [user, handleError]);

  const deleteDiaryEntry = useCallback(async (entryId: string) => {
    if (!user) return false;
    setLoading(true);
    setError(null);
    try {
      const result = await firestoreService.deleteDiaryEntry(entryId);
      setLoading(false);
      return result;
    } catch (error) {
      handleError(error, '다이어리 항목 삭제 중 오류가 발생했습니다.');
      return false;
    }
  }, [user, handleError]);

  const getDiaryEntries = useCallback(async () => {
    if (!user) return [];
    setLoading(true);
    setError(null);
    try {
      const entries = await firestoreService.getDiaryEntries(user.uid);
      setLoading(false);
      return entries;
    } catch (error) {
      handleError(error, '다이어리 항목 목록 가져오기 중 오류가 발생했습니다.');
      return [];
    }
  }, [user, handleError]);

  const getDiaryEntriesByDateRange = useCallback(async (startDate: string, endDate: string) => {
    if (!user) return [];
    setLoading(true);
    setError(null);
    try {
      const entries = await firestoreService.getDiaryEntriesByDateRange(user.uid, startDate, endDate);
      setLoading(false);
      return entries;
    } catch (error) {
      handleError(error, '기간별 다이어리 항목 목록 가져오기 중 오류가 발생했습니다.');
      return [];
    }
  }, [user, handleError]);

  // 완료된 작업 관련 훅 함수
  const createCompletedTask = useCallback(async (task: CompletedTask) => {
    if (!user) return null;
    setLoading(true);
    setError(null);
    try {
      const taskId = await firestoreService.createCompletedTask(user.uid, task);
      setLoading(false);
      return taskId;
    } catch (error) {
      handleError(error, '완료된 작업 생성 중 오류가 발생했습니다.');
      return null;
    }
  }, [user, handleError]);

  const deleteCompletedTask = useCallback(async (taskId: string) => {
    if (!user) return false;
    setLoading(true);
    setError(null);
    try {
      const result = await firestoreService.deleteCompletedTask(taskId);
      setLoading(false);
      return result;
    } catch (error) {
      handleError(error, '완료된 작업 삭제 중 오류가 발생했습니다.');
      return false;
    }
  }, [user, handleError]);

  const getCompletedTasks = useCallback(async () => {
    if (!user) return [];
    setLoading(true);
    setError(null);
    try {
      const tasks = await firestoreService.getCompletedTasks(user.uid);
      setLoading(false);
      return tasks;
    } catch (error) {
      handleError(error, '완료된 작업 목록 가져오기 중 오류가 발생했습니다.');
      return [];
    }
  }, [user, handleError]);

  // 데이터 마이그레이션 훅 함수
  const migrateLocalDataToFirestore = useCallback(async (localData: {
    goals: Goal[],
    todos: Todo[],
    diaryEntries: DiaryEntry[],
    completedTasks: CompletedTask[]
  }) => {
    if (!user) return false;
    setLoading(true);
    setError(null);
    try {
      const result = await firestoreService.migrateLocalDataToFirestore(user.uid, localData);
      setLoading(false);
      return result;
    } catch (error) {
      handleError(error, '로컬 데이터 마이그레이션 중 오류가 발생했습니다.');
      return false;
    }
  }, [user, handleError]);

  // 데이터 초기화 함수 (로컬 스토리지 -> Firestore 전환 시 필요)
  const initializeUserData = useCallback(async () => {
    if (!user) return false;
    
    try {
      setLoading(true);
      setError(null);
      
      // 로컬 스토리지에서 데이터 가져오기
      const LOCAL_STORAGE_KEYS = {
        GOALS: 'planner_goals',
        TODOS: 'planner_todos',
        DIARY: 'planner_diary',
        COMPLETED_TASKS: 'planner_completed_tasks'
      };
      
      const goals = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.GOALS) || '[]');
      const todos = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.TODOS) || '[]');
      const diaryEntries = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.DIARY) || '[]');
      const completedTasks = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.COMPLETED_TASKS) || '[]');
      
      // 사용자 프로필 저장
      await firestoreService.saveUserData(user);
      
      // Firestore에 데이터 마이그레이션
      const localData = { goals, todos, diaryEntries, completedTasks };
      const result = await migrateLocalDataToFirestore(localData);
      
      setLoading(false);
      return result;
    } catch (error) {
      handleError(error, '사용자 데이터 초기화 중 오류가 발생했습니다.');
      return false;
    }
  }, [user, handleError, migrateLocalDataToFirestore]);

  // useFirestore 훅 내부에 아래 함수들을 추가합니다
const checkTodoExists = useCallback(async (todoId: string): Promise<boolean> => {
  if (!user) return false;
  try {
    return await firestoreService.checkTodoExists(todoId);
  } catch (error) {
    handleError(error, 'Todo 문서 확인 중 오류가 발생했습니다.');
    return false;
  }
}, [user, handleError]);

const checkCompletedTaskExists = useCallback(async (taskId: string): Promise<boolean> => {
  if (!user) return false;
  try {
    return await firestoreService.checkCompletedTaskExists(taskId);
  } catch (error) {
    handleError(error, 'CompletedTask 문서 확인 중 오류가 발생했습니다.');
    return false;
  }
}, [user, handleError]);

  // 로딩 상태와 에러를 재설정하는 함수
  const resetState = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  // return 문에 함수 추가
  return {
    // 상태 값
    loading,
    error,
    resetState,
    
    // 목표 관련 함수
    createGoal,
    updateGoal,
    deleteGoal,
    getGoals,
    
    // 할 일 관련 함수
    createTodo,
    updateTodo,
    deleteTodo,
    getTodos,
    getTodosByDateRange,
    checkTodoExists, // 추가된 함수
    
    // 다이어리 관련 함수
    createDiaryEntry,
    updateDiaryEntry,
    deleteDiaryEntry,
    getDiaryEntries,
    getDiaryEntriesByDateRange,
    
    // 완료된 작업 관련 함수
    createCompletedTask,
    deleteCompletedTask,
    getCompletedTasks,
    checkCompletedTaskExists, // 추가된 함수
    
    // 데이터 마이그레이션 함수
    migrateLocalDataToFirestore,
    initializeUserData,
  };
}