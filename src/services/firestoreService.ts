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
    Timestamp, 
    addDoc, 
    writeBatch,
    deleteField
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
  
  // 사용자 정보 저장 및 업데이트
  export const saveUserData = async (user: User) => {
    try {
      const userRef = doc(db, COLLECTIONS.USERS, user.uid);
      await setDoc(userRef, {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        lastLogin: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }, { merge: true });
      return true;
    } catch (error) {
      console.error('Error saving user data:', error);
      throw error;
    }
  };
  
  export const updateUserProfile = async (uid: string, data: { displayName?: string; photoURL?: string }) => {
    try {
      const userRef = doc(db, COLLECTIONS.USERS, uid);
      await updateDoc(userRef, {
        ...data,
        updatedAt: Timestamp.now(),
      });
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
      const goalData = {
        ...goal,
        userId,
        createdAt: Timestamp.fromDate(new Date(goal.createdAt)),
        updatedAt: Timestamp.now(),
      };
  
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
      await updateDoc(goalRef, {
        ...goal,
        updatedAt: Timestamp.now(),
      });
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
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
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
      
      // undefined 값이 있는 필드를 제거한 객체 만들기
      const todoData: Record<string, any> = {
        ...Object.entries(todo).reduce((acc, [key, value]) => {
          if (value !== undefined) {
            acc[key] = value;
          }
          return acc;
        }, {} as Record<string, any>),
        userId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
  
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
      
      // Firebase는 undefined 값을 지원하지 않으므로 해당 필드 처리
      const todoData: Record<string, any> = { ...todo };
      
      // actualCompletionTime이 undefined인 경우 해당 필드 제거
      // deleteField()를 사용하여 필드를 명시적으로 삭제
      if (todoData.actualCompletionTime === undefined) {
        todoData.actualCompletionTime = deleteField();
      }
      
      // 업데이트 시간 추가
      todoData.updatedAt = Timestamp.now();
      
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
        const data = doc.data();
        // Timestamp 타입인지 확인하고 처리
        let actualCompletionTime = undefined;
        if (data.actualCompletionTime) {
          // Timestamp 객체인 경우
          if (data.actualCompletionTime.toDate instanceof Function) {
            actualCompletionTime = data.actualCompletionTime.toDate().toISOString();
          } 
          // 이미 ISO 문자열인 경우
          else if (typeof data.actualCompletionTime === 'string') {
            actualCompletionTime = data.actualCompletionTime;
          }
        }
        
        return {
          ...data,
          id: doc.id,
          actualCompletionTime,
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
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          actualCompletionTime: data.actualCompletionTime?.toDate().toISOString(),
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
          updatedAt: Timestamp.now(),
        });
        return existingEntry.id;
      } else {
        // 새 항목 생성
        const entriesRef = collection(db, COLLECTIONS.DIARY_ENTRIES);
        const entryData = {
          ...entry,
          userId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
  
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
      await updateDoc(entryRef, {
        ...entry,
        updatedAt: Timestamp.now(),
      });
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
        const data = doc.data();
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
        const data = doc.data();
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
      const taskData = {
        ...task,
        userId,
        completedDate: task.completedDate ? new Date(task.completedDate) : new Date(),
        createdAt: Timestamp.now(),
      };
  
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
        const data = doc.data();
        
        // Timestamp 타입인지 확인하고 처리
        let completedDate = new Date().toISOString();
        if (data.completedDate) {
          // Timestamp 객체인 경우
          if (data.completedDate.toDate instanceof Function) {
            completedDate = data.completedDate.toDate().toISOString();
          } 
          // 이미 ISO 문자열인 경우
          else if (typeof data.completedDate === 'string') {
            completedDate = data.completedDate;
          }
        }
        
        return {
          ...data,
          id: doc.id,
          completedDate,
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
        batch.set(goalRef, {
          ...goal,
          userId,
          createdAt: Timestamp.fromDate(new Date(goal.createdAt)),
          updatedAt: Timestamp.now(),
        });
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
          
          // undefined 값이 있는 필드를 제거한 객체 만들기
          const todoData: Record<string, any> = {
            ...Object.entries(todo).reduce((acc, [key, value]) => {
              if (value !== undefined) {
                acc[key] = value;
              }
              return acc;
            }, {} as Record<string, any>),
            userId,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };
          
          // actualCompletionTime 특수 처리
          if (todo.actualCompletionTime) {
            todoData.actualCompletionTime = Timestamp.fromDate(new Date(todo.actualCompletionTime));
          }
          
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
        batch.set(entryRef, {
          ...entry,
          userId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      });
      
      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error bulk saving diary entries:', error);
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
      // 목표 데이터 마이그레이션
      if (localData.goals.length > 0) {
        await bulkSaveGoals(userId, localData.goals);
      }
      
      // 할 일 데이터 마이그레이션
      if (localData.todos.length > 0) {
        await bulkSaveTodos(userId, localData.todos);
      }
      
      // 다이어리 데이터 마이그레이션
      if (localData.diaryEntries.length > 0) {
        await bulkSaveDiaryEntries(userId, localData.diaryEntries);
      }
      
      // 완료된 작업 데이터 마이그레이션
      if (localData.completedTasks.length > 0) {
        const batchSize = 499;
        
        for (let i = 0; i < localData.completedTasks.length; i += batchSize) {
          const batch = writeBatch(db);
          const chunk = localData.completedTasks.slice(i, i + batchSize);
          
          chunk.forEach(task => {
            const taskRef = doc(db, COLLECTIONS.COMPLETED_TASKS, task.id);
            batch.set(taskRef, {
              ...task,
              userId,
              completedDate: Timestamp.fromDate(new Date(task.completedDate)),
              createdAt: Timestamp.now(),
            });
          });
          
          await batch.commit();
        }
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