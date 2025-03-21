import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  addDoc, 
  writeBatch,
  deleteField,
  limit
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Goal, Todo, DiaryEntry, CompletedTask } from '../types/planner';
import { User } from '../types/auth';

// 컬렉션 경로 상수
const COLLECTIONS = {
  USERS: 'users',
  GOALS: 'goals',
  TODOS: 'todos',
  DIARY_ENTRIES: 'diary_entries',
  COMPLETED_TASKS: 'completed_tasks',
} as const;

// Firestore에서 가져온 데이터를 앱에서 사용할 수 있는 형식으로 변환
const convertFromFirestore = (data: any) => {
  if (!data) return data;
  
  const result = { ...data };
  
  // Timestamp 객체 변환 및 날짜 처리
  Object.keys(result).forEach(key => {
    const value = result[key];
    
    // Timestamp 객체인 경우 ISO 문자열로 변환
    if (value && typeof value === 'object' && value.toDate instanceof Function) {
      result[key] = value.toDate().toISOString();
    }
    // 날짜를 포함할 수 있는 키 이름인 경우 (createdAt, updatedAt, date, startDate 등)
    else if (
      (key.includes('date') || key.includes('Date') || key.includes('At') || key === 'completedTime') && 
      value && 
      key !== 'scheduledTime' // scheduledTime은 제외
    ) {
      // 이미 ISO 문자열이거나 날짜로 변환 가능한지 확인
      try {
        if (typeof value === 'string') {
          // 유효한 날짜인지 확인만 (실제로 변환하지는 않음)
          new Date(value).toISOString();
          // 유효하면 원래 값 유지
        } else if (typeof value === 'number') {
          // 타임스탬프(숫자)인 경우 ISO 문자열로 변환
          result[key] = new Date(value).toISOString();
        }
      } catch (error) {
        console.warn(`Invalid date format for field '${key}':`, value);
        // 유효하지 않은 날짜는 원래 값 유지
      }
    }
    // 중첩 객체 재귀적 처리
    else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = convertFromFirestore(value);
    }
    // 배열인 경우 각 항목 처리
    else if (Array.isArray(value)) {
      result[key] = value.map(item => 
        typeof item === 'object' ? convertFromFirestore(item) : item
      );
    }
  });
  
  return result;
};

// convertToFirestore 함수도 수정
const convertToFirestore = (data: any) => {
  if (!data) return data;
  
  const result = { ...data };
  
  // undefined 값 제거 및 날짜 처리
  Object.keys(result).forEach(key => {
    const value = result[key];
    
    // undefined 값 제거
    if (value === undefined) {
      delete result[key];
    }
    // 날짜 문자열 유효성 검사 (scheduledTime 제외)
    else if (
      (key.includes('date') || key.includes('Date') || key.includes('At') || key === 'completedTime') && 
      typeof value === 'string' &&
      key !== 'scheduledTime' // scheduledTime은 제외
    ) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          // 유효한 날짜면 문자열 형태 유지 (Timestamp로 변환하지 않음)
        } else {
          console.warn(`Invalid date string for field '${key}':`, value);
          delete result[key]; // 유효하지 않은 날짜 필드 제거
        }
      } catch (error) {
        console.warn(`Error parsing date for field '${key}':`, error);
        delete result[key]; // 오류 발생 시 필드 제거
      }
    }
    // 시간 필드(HH:MM 형식) 유효성 검사
    else if (key === 'scheduledTime' && typeof value === 'string') {
      // HH:MM 형식 확인 (정규식 사용)
      if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
        console.warn(`Invalid time format for scheduledTime:`, value);
        result[key] = '09:00'; // 기본값으로 대체
      }
      // 유효하면 원래 값 유지
    }
    // 중첩 객체 재귀적 처리
    else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = convertToFirestore(value);
    }
    // 배열인 경우 각 항목 처리
    else if (Array.isArray(value)) {
      result[key] = value.map(item => 
        typeof item === 'object' ? convertToFirestore(item) : item
      );
    }
  });
  
  return result;
};

// 사용자 정보 저장 및 업데이트
export const saveUserData = async (user: User) => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, user.uid);
    const userData = {
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      lastLogin: new Date().toISOString(), // 문자열로 저장
      updatedAt: new Date().toISOString(), // 문자열로 저장
    };
    
    await setDoc(userRef, userData, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving user data:', error);
    throw error;
  }
};

export const updateUserProfile = async (uid: string, data: { displayName?: string; photoURL?: string }) => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    const userData = {
      ...data,
      updatedAt: new Date().toISOString(), // 문자열로 저장
    };
    
    await updateDoc(userRef, userData);
    return true;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// 목표 관련 CRUD 함수
export const createGoal = async (userId: string, goal: Goal) => {
  try {
    const goalsRef = collection(db, COLLECTIONS.GOALS);
    
    // 날짜 필드를 일관되게 문자열로 처리
    const goalData = convertToFirestore({
      ...goal,
      userId,
      createdAt: goal.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  
    // ID가 있는 경우에는 해당 ID를 사용
    if (goal.id) {
      const goalRef = doc(db, COLLECTIONS.GOALS, goal.id);
      await setDoc(goalRef, goalData);
      return goal.id;
    } else {
      // ID가 없는 경우에는 새로운 문서 생성
      const newGoalRef = await addDoc(goalsRef, goalData);
      return newGoalRef.id;
    }
  } catch (error) {
    console.error('Error creating goal:', error);
    throw error;
  }
};

export const updateGoal = async (goalId: string, goal: Partial<Goal>) => {
  try {
    const goalRef = doc(db, COLLECTIONS.GOALS, goalId);
    
    // 데이터 변환 함수 사용
    const goalData = convertToFirestore({
      ...goal,
      updatedAt: new Date().toISOString(),
    });
    
    await updateDoc(goalRef, goalData);
    return true;
  } catch (error) {
    console.error('Error updating goal:', error);
    throw error;
  }
};

export const deleteGoal = async (goalId: string) => {
  try {
    // 목표 삭제
    const goalRef = doc(db, COLLECTIONS.GOALS, goalId);
    await deleteDoc(goalRef);

    // 관련된 할 일 삭제
    const todosQuery = query(
      collection(db, COLLECTIONS.TODOS),
      where('goalId', '==', goalId)
    );
    const todosSnapshot = await getDocs(todosQuery);
    
    // 배치 작업으로 일괄 삭제
    const batch = writeBatch(db);
    todosSnapshot.forEach((todoDoc) => {
      batch.delete(todoDoc.ref);
    });

    // 관련된 완료 작업 삭제
    const completedTasksQuery = query(
      collection(db, COLLECTIONS.COMPLETED_TASKS),
      where('goalId', '==', goalId)
    );
    const completedTasksSnapshot = await getDocs(completedTasksQuery);
    completedTasksSnapshot.forEach((taskDoc) => {
      batch.delete(taskDoc.ref);
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error deleting goal:', error);
    throw error;
  }
};

export const getGoals = async (userId: string) => {
  try {
    const goalsQuery = query(
      collection(db, COLLECTIONS.GOALS),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(goalsQuery);
    
    return querySnapshot.docs.map(doc => {
      // 데이터 변환 함수를 사용하여 안전하게 처리
      const data = convertFromFirestore(doc.data());
      
      return {
        ...data,
        id: doc.id,
        // createdAt이 없거나 변환 실패한 경우 현재 시간으로 기본값 설정
        createdAt: data.createdAt || new Date().toISOString(),
      } as Goal;
    });
  } catch (error) {
    console.error('Error getting goals:', error);
    throw error;
  }
};

// 할 일 관련 CRUD 함수
export const createTodo = async (userId: string, todo: Todo) => {
  try {
    const todosRef = collection(db, COLLECTIONS.TODOS);
    
    // undefined 값이 있는 필드를 제거하고 날짜 처리
    const todoData = convertToFirestore({
      ...todo,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  
    if (todo.id) {
      const todoRef = doc(db, COLLECTIONS.TODOS, todo.id);
      await setDoc(todoRef, todoData);
      return todo.id;
    } else {
      const newTodoRef = await addDoc(todosRef, todoData);
      return newTodoRef.id;
    }
  } catch (error) {
    console.error('Error creating todo:', error);
    throw error;
  }
};

export const updateTodo = async (todoId: string, todo: Partial<Todo>) => {
  try {
    const todoRef = doc(db, COLLECTIONS.TODOS, todoId);
    
    // 데이터 변환 함수 사용
    const todoData = convertToFirestore({ 
      ...todo,
      updatedAt: new Date().toISOString() 
    });
    
    // actualCompletionTime이 undefined인 경우 해당 필드 제거
    if (todo.actualCompletionTime === undefined && 'actualCompletionTime' in todo) {
      todoData.actualCompletionTime = deleteField();
    }
    
    await updateDoc(todoRef, todoData);
    return true;
  } catch (error) {
    console.error('Error updating todo:', error);
    throw error;
  }
};

export const deleteTodo = async (todoId: string) => {
  try {
    const todoRef = doc(db, COLLECTIONS.TODOS, todoId);
    await deleteDoc(todoRef);
    return true;
  } catch (error) {
    console.error('Error deleting todo:', error);
    throw error;
  }
};

export const getTodos = async (userId: string) => {
  try {
    const todosQuery = query(
      collection(db, COLLECTIONS.TODOS),
      where('userId', '==', userId),
      orderBy('scheduledDate', 'asc'),
      orderBy('scheduledTime', 'asc')
    );
    
    const querySnapshot = await getDocs(todosQuery);
    
    return querySnapshot.docs.map(doc => {
      // 데이터 변환 함수 사용
      const data = convertFromFirestore(doc.data());
      
      return {
        ...data,
        id: doc.id,
      } as Todo;
    });
  } catch (error) {
    console.error('Error getting todos:', error);
    throw error;
  }
};

export const getTodosByDateRange = async (userId: string, startDate: string, endDate: string) => {
  try {
    const todosQuery = query(
      collection(db, COLLECTIONS.TODOS),
      where('userId', '==', userId),
      where('scheduledDate', '>=', startDate),
      where('scheduledDate', '<=', endDate),
      orderBy('scheduledDate', 'asc'),
      orderBy('scheduledTime', 'asc')
    );
    
    const querySnapshot = await getDocs(todosQuery);
    
    return querySnapshot.docs.map(doc => {
      // 데이터 변환 함수 사용
      const data = convertFromFirestore(doc.data());
      
      return {
        ...data,
        id: doc.id,
      } as Todo;
    });
  } catch (error) {
    console.error('Error getting todos by date range:', error);
    throw error;
  }
};

// 다이어리 항목 관련 CRUD 함수
export const createDiaryEntry = async (userId: string, entry: DiaryEntry) => {
  try {
    // 같은 날짜의 기존 항목이 있는지 확인
    const entriesQuery = query(
      collection(db, COLLECTIONS.DIARY_ENTRIES),
      where('userId', '==', userId),
      where('date', '==', entry.date)
    );
    
    const querySnapshot = await getDocs(entriesQuery);
    
    // 기존 항목이 있으면 업데이트, 없으면 새로 생성
    if (!querySnapshot.empty) {
      const existingEntry = querySnapshot.docs[0];
      const entryRef = doc(db, COLLECTIONS.DIARY_ENTRIES, existingEntry.id);
      
      await updateDoc(entryRef, {
        content: entry.content,
        updatedAt: new Date().toISOString(),
      });
      
      return existingEntry.id;
    } else {
      // 새 항목 생성
      const entriesRef = collection(db, COLLECTIONS.DIARY_ENTRIES);
      
      const entryData = convertToFirestore({
        ...entry,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
  
      if (entry.id) {
        const entryRef = doc(db, COLLECTIONS.DIARY_ENTRIES, entry.id);
        await setDoc(entryRef, entryData);
        return entry.id;
      } else {
        const newEntryRef = await addDoc(entriesRef, entryData);
        return newEntryRef.id;
      }
    }
  } catch (error) {
    console.error('Error creating diary entry:', error);
    throw error;
  }
};

export const updateDiaryEntry = async (entryId: string, entry: Partial<DiaryEntry>) => {
  try {
    const entryRef = doc(db, COLLECTIONS.DIARY_ENTRIES, entryId);
    
    const entryData = convertToFirestore({
      ...entry,
      updatedAt: new Date().toISOString(),
    });
    
    await updateDoc(entryRef, entryData);
    return true;
  } catch (error) {
    console.error('Error updating diary entry:', error);
    throw error;
  }
};

export const deleteDiaryEntry = async (entryId: string) => {
  try {
    const entryRef = doc(db, COLLECTIONS.DIARY_ENTRIES, entryId);
    await deleteDoc(entryRef);
    return true;
  } catch (error) {
    console.error('Error deleting diary entry:', error);
    throw error;
  }
};

export const getDiaryEntries = async (userId: string) => {
  try {
    // 정렬 조건이 많은 복합 쿼리 대신 단순화된 쿼리 사용
    const entriesQuery = query(
      collection(db, COLLECTIONS.DIARY_ENTRIES),
      where('userId', '==', userId)
      // orderBy를 제거하거나 인덱스가 생성된 후 다시 추가
    );
    
    const querySnapshot = await getDocs(entriesQuery);
    
    const entries = querySnapshot.docs.map(doc => {
      // 데이터 변환 함수 사용
      const data = convertFromFirestore(doc.data());
      
      return {
        ...data,
        id: doc.id,
      } as DiaryEntry;
    });
    
    // 클라이언트에서 정렬
    return entries.sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {
    console.error('Error getting diary entries:', error);
    throw error;
  }
};

export const getDiaryEntriesByDateRange = async (userId: string, startDate: string, endDate: string) => {
  try {
    const entriesQuery = query(
      collection(db, COLLECTIONS.DIARY_ENTRIES),
      where('userId', '==', userId),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'asc')
    );
    
    const querySnapshot = await getDocs(entriesQuery);
    
    return querySnapshot.docs.map(doc => {
      // 데이터 변환 함수 사용
      const data = convertFromFirestore(doc.data());
      
      return {
        ...data,
        id: doc.id,
      } as DiaryEntry;
    });
  } catch (error) {
    console.error('Error getting diary entries by date range:', error);
    throw error;
  }
};

// 완료된 작업 관련 함수
export const createCompletedTask = async (userId: string, task: CompletedTask) => {
  try {
    const tasksRef = collection(db, COLLECTIONS.COMPLETED_TASKS);
    
    const taskData = convertToFirestore({
      ...task,
      userId,
      completedDate: task.completedDate || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
  
    if (task.id) {
      const taskRef = doc(db, COLLECTIONS.COMPLETED_TASKS, task.id);
      await setDoc(taskRef, taskData);
      return task.id;
    } else {
      const newTaskRef = await addDoc(tasksRef, taskData);
      return newTaskRef.id;
    }
  } catch (error) {
    console.error('Error creating completed task:', error);
    throw error;
  }
};

export const deleteCompletedTask = async (taskId: string) => {
  try {
    const taskRef = doc(db, COLLECTIONS.COMPLETED_TASKS, taskId);
    await deleteDoc(taskRef);
    return true;
  } catch (error) {
    console.error('Error deleting completed task:', error);
    throw error;
  }
};

export const getCompletedTasks = async (userId: string) => {
  try {
    const tasksQuery = query(
      collection(db, COLLECTIONS.COMPLETED_TASKS),
      where('userId', '==', userId),
      orderBy('completedDate', 'desc')
    );
    
    const querySnapshot = await getDocs(tasksQuery);
    
    return querySnapshot.docs.map(doc => {
      // 데이터 변환 함수 사용
      const data = convertFromFirestore(doc.data());
      
      return {
        ...data,
        id: doc.id,
        // completedDate가 없는 경우 현재 시간으로 기본값 설정
        completedDate: data.completedDate || new Date().toISOString(),
      } as CompletedTask;
    });
  } catch (error) {
    console.error('Error getting completed tasks:', error);
    throw error;
  }
};
// 벌크 데이터 저장 (초기 데이터 로드 또는 마이그레이션에 유용)
export const bulkSaveGoals = async (userId: string, goals: Goal[]) => {
  try {
    const batch = writeBatch(db);
    
    goals.forEach(goal => {
      const goalRef = doc(db, COLLECTIONS.GOALS, goal.id);
      
      // 데이터 변환 함수 사용하여 날짜 필드 처리
      const goalData = convertToFirestore({
        ...goal,
        userId,
        createdAt: goal.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      batch.set(goalRef, goalData);
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error bulk saving goals:', error);
    throw error;
  }
};

export const bulkSaveTodos = async (userId: string, todos: Todo[]) => {
  try {
    // Firestore 제한으로 인해 한 번에 최대 500개까지 배치 작업 가능
    const batchSize = 499; // 안전하게 499개로 설정
    
    for (let i = 0; i < todos.length; i += batchSize) {
      const batch = writeBatch(db);
      const chunk = todos.slice(i, i + batchSize);
      
      chunk.forEach(todo => {
        const todoRef = doc(db, COLLECTIONS.TODOS, todo.id);
        
        // 데이터 변환 함수 사용
        const todoData = convertToFirestore({
          ...todo,
          userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        
        batch.set(todoRef, todoData);
      });
      
      await batch.commit();
    }
    
    return true;
  } catch (error) {
    console.error('Error bulk saving todos:', error);
    throw error;
  }
};

export const bulkSaveDiaryEntries = async (userId: string, entries: DiaryEntry[]) => {
  try {
    const batch = writeBatch(db);
    
    entries.forEach(entry => {
      const entryRef = doc(db, COLLECTIONS.DIARY_ENTRIES, entry.id);
      
      // 데이터 변환 함수 사용
      const entryData = convertToFirestore({
        ...entry,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      batch.set(entryRef, entryData);
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error bulk saving diary entries:', error);
    throw error;
  }
};

export const bulkSaveCompletedTasks = async (userId: string, tasks: CompletedTask[]) => {
  try {
    const batchSize = 499; // 안전하게 499개로 설정
    
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = writeBatch(db);
      const chunk = tasks.slice(i, i + batchSize);
      
      chunk.forEach(task => {
        const taskRef = doc(db, COLLECTIONS.COMPLETED_TASKS, task.id);
        
        // 데이터 변환 함수 사용
        const taskData = convertToFirestore({
          ...task,
          userId,
          completedDate: task.completedDate || new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
        
        batch.set(taskRef, taskData);
      });
      
      await batch.commit();
    }
    
    return true;
  } catch (error) {
    console.error('Error bulk saving completed tasks:', error);
    throw error;
  }
};

// 데이터 마이그레이션 (로컬 스토리지에서 Firestore로)
export const migrateLocalDataToFirestore = async (userId: string, localData: {
  goals: Goal[],
  todos: Todo[],
  diaryEntries: DiaryEntry[],
  completedTasks: CompletedTask[]
}) => {
  try {
    // 각 데이터 유효성 검사 추가
    const validGoals = localData.goals.filter(goal => {
      try {
        // 필수 필드 확인
        if (!goal || !goal.id || !goal.title || !goal.type) {
          console.warn('Invalid goal data:', goal);
          return false;
        }
        
        // 날짜 필드 검증
        if (goal.startDate) new Date(goal.startDate);
        if (goal.endDate) new Date(goal.endDate);
        if (goal.createdAt) new Date(goal.createdAt);
        
        return true;
      } catch (error) {
        console.warn('Goal validation error:', error);
        return false;
      }
    });
    
    const validTodos = localData.todos.filter(todo => {
      try {
        // 필수 필드 확인
        if (!todo || !todo.id || !todo.title) {
          console.warn('Invalid todo data:', todo);
          return false;
        }
        
        // 날짜 필드 검증
        if (todo.scheduledDate) new Date(todo.scheduledDate);
        if (todo.actualCompletionTime) new Date(todo.actualCompletionTime);
        
        return true;
      } catch (error) {
        console.warn('Todo validation error:', error);
        return false;
      }
    });
    
    // 목표 데이터 마이그레이션
    if (validGoals.length > 0) {
      await bulkSaveGoals(userId, validGoals);
    }
    
    // 할 일 데이터 마이그레이션
    if (validTodos.length > 0) {
      await bulkSaveTodos(userId, validTodos);
    }
    
    // 다이어리 데이터 마이그레이션
    if (localData.diaryEntries.length > 0) {
      await bulkSaveDiaryEntries(userId, localData.diaryEntries);
    }
    
    // 완료된 작업 데이터 마이그레이션
    if (localData.completedTasks.length > 0) {
      await bulkSaveCompletedTasks(userId, localData.completedTasks);
    }
    
    return true;
  } catch (error) {
    console.error('Error migrating local data to Firestore:', error);
    throw error;
  }
};

export const checkTodoExists = async (todoId: string): Promise<boolean> => {
  try {
    const todoRef = doc(db, COLLECTIONS.TODOS, todoId);
    const todoSnap = await getDoc(todoRef);
    return todoSnap.exists();
  } catch (error) {
    console.error('Todo 문서 확인 중 오류:', error);
    return false;
  }
};

// CompletedTask 문서가 존재하는지 확인하는 함수
export const checkCompletedTaskExists = async (taskId: string): Promise<boolean> => {
  try {
    const taskRef = doc(db, COLLECTIONS.COMPLETED_TASKS, taskId);
    const taskSnap = await getDoc(taskRef);
    return taskSnap.exists();
  } catch (error) {
    console.error('CompletedTask 문서 확인 중 오류:', error);
    return false;
  }
};

// Goal 문서가 존재하는지 확인하는 함수
export const checkGoalExists = async (goalId: string): Promise<boolean> => {
  try {
    const goalRef = doc(db, COLLECTIONS.GOALS, goalId);
    const goalSnap = await getDoc(goalRef);
    return goalSnap.exists();
  } catch (error) {
    console.error('Goal 문서 확인 중 오류:', error);
    return false;
  }
};

// DiaryEntry 문서가 존재하는지 확인하는 함수
export const checkDiaryEntryExists = async (entryId: string): Promise<boolean> => {
  try {
    const entryRef = doc(db, COLLECTIONS.DIARY_ENTRIES, entryId);
    const entrySnap = await getDoc(entryRef);
    return entrySnap.exists();
  } catch (error) {
    console.error('DiaryEntry 문서 확인 중 오류:', error);
    return false;
  }
};

// 특정 날짜의 다이어리 항목이 존재하는지 확인하는 함수
export const checkDiaryEntryExistsByDate = async (userId: string, date: string): Promise<{exists: boolean, entryId?: string}> => {
  try {
    const entriesQuery = query(
      collection(db, COLLECTIONS.DIARY_ENTRIES),
      where('userId', '==', userId),
      where('date', '==', date)
    );
    
    const querySnapshot = await getDocs(entriesQuery);
    
    if (!querySnapshot.empty) {
      return {
        exists: true,
        entryId: querySnapshot.docs[0].id
      };
    }
    
    return { exists: false };
  } catch (error) {
    console.error('날짜별 다이어리 항목 확인 중 오류:', error);
    return { exists: false };
  }
};

// 특정 날짜에 할 일이 존재하는지 확인하는 함수
export const checkTodosExistByDate = async (userId: string, date: string): Promise<boolean> => {
  try {
    const todosQuery = query(
      collection(db, COLLECTIONS.TODOS),
      where('userId', '==', userId),
      where('scheduledDate', '==', date),
      limit(1) // 하나만 확인해도 충분함
    );
    
    const querySnapshot = await getDocs(todosQuery);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('날짜별 할 일 확인 중 오류:', error);
    return false;
  }
};

// 오류가 발생한 데이터 복구를 위한 함수 (필요한 경우)
export const fixDateFormats = async (userId: string) => {
  try {
    const result = {
      goals: 0,
      todos: 0,
      diaryEntries: 0,
      completedTasks: 0
    };
    
    // 목표 날짜 형식 수정
    const goalsQuery = query(
      collection(db, COLLECTIONS.GOALS),
      where('userId', '==', userId)
    );
    
    const goalsSnapshot = await getDocs(goalsQuery);
    
    const goalsBatch = writeBatch(db);
    let goalCount = 0;
    
    goalsSnapshot.forEach(doc => {
      const data = doc.data();
      const fixedData = convertToFirestore(convertFromFirestore(data));
      
      if (JSON.stringify(data) !== JSON.stringify(fixedData)) {
        goalsBatch.set(doc.ref, fixedData);
        goalCount++;
      }
    });
    
    if (goalCount > 0) {
      await goalsBatch.commit();
      result.goals = goalCount;
    }
    
    // 할 일 날짜 형식 수정
    const todosQuery = query(
      collection(db, COLLECTIONS.TODOS),
      where('userId', '==', userId)
    );
    
    const todosSnapshot = await getDocs(todosQuery);
    
    const todosBatch = writeBatch(db);
    let todoCount = 0;
    
    todosSnapshot.forEach(doc => {
      const data = doc.data();
      const fixedData = convertToFirestore(convertFromFirestore(data));
      
      if (JSON.stringify(data) !== JSON.stringify(fixedData)) {
        todosBatch.set(doc.ref, fixedData);
        todoCount++;
      }
    });
    
    if (todoCount > 0) {
      await todosBatch.commit();
      result.todos = todoCount;
    }
    
    // 다이어리 날짜 형식 수정
    const entriesQuery = query(
      collection(db, COLLECTIONS.DIARY_ENTRIES),
      where('userId', '==', userId)
    );
    
    const entriesSnapshot = await getDocs(entriesQuery);
    
    const entriesBatch = writeBatch(db);
    let entriesCount = 0;
    
    entriesSnapshot.forEach(doc => {
      const data = doc.data();
      const fixedData = convertToFirestore(convertFromFirestore(data));
      
      if (JSON.stringify(data) !== JSON.stringify(fixedData)) {
        entriesBatch.set(doc.ref, fixedData);
        entriesCount++;
      }
    });
    
    if (entriesCount > 0) {
      await entriesBatch.commit();
      result.diaryEntries = entriesCount;
    }
    
    // 완료된 작업 날짜 형식 수정
    const tasksQuery = query(
      collection(db, COLLECTIONS.COMPLETED_TASKS),
      where('userId', '==', userId)
    );
    
    const tasksSnapshot = await getDocs(tasksQuery);
    
    const tasksBatch = writeBatch(db);
    let tasksCount = 0;
    
    tasksSnapshot.forEach(doc => {
      const data = doc.data();
      const fixedData = convertToFirestore(convertFromFirestore(data));
      
      if (JSON.stringify(data) !== JSON.stringify(fixedData)) {
        tasksBatch.set(doc.ref, fixedData);
        tasksCount++;
      }
    });
    
    if (tasksCount > 0) {
      await tasksBatch.commit();
      result.completedTasks = tasksCount;
    }
    
    return result;
  } catch (error) {
    console.error('데이터 형식 수정 중 오류:', error);
    throw error;
  }
};