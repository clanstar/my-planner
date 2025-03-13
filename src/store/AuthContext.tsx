import React, { createContext, useReducer, useEffect, ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import {
  loginUser,
  registerUser,
  logoutUser,
  resetUserPassword,
  updateUserProfile
} from '../services/authService';
import {
  AuthState,
  AuthAction,
  AuthContextType,
  User,
  RegisterFormData,
  ProfileUpdateFormData
} from '../types/auth';

// 초기 상태 정의
const initialState: AuthState = {
  user: null,
  loading: true,
  error: null
};

// 리듀서 함수 정의
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        loading: true,
        error: null
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        loading: false,
        error: null
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        loading: false,
        error: null
      };
    case 'AUTH_RESET_ERROR':
      return {
        ...state,
        error: null
      };
    default:
      return state;
  }
};

// Context 인스턴스 생성
export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// Context Provider 컴포넌트
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Firebase 인증 상태 변경 리스너
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        dispatch({ type: 'AUTH_SUCCESS', payload: user as User });
      } else {
        dispatch({ type: 'AUTH_LOGOUT' });
      }
    });

    // 컴포넌트 언마운트 시 리스너 해제
    return () => unsubscribe();
  }, []);

  // 로그인 함수
  const login = async (email: string, password: string) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const userCredential = await loginUser(email, password);
      dispatch({ type: 'AUTH_SUCCESS', payload: userCredential.user as User });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '로그인에 실패했습니다.';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      throw error;
    }
  };

  // 회원가입 함수
  const register = async (userData: RegisterFormData) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const user = await registerUser(userData);
      dispatch({ type: 'AUTH_SUCCESS', payload: user as User });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '회원가입에 실패했습니다.';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      throw error;
    }
  };

  // 로그아웃 함수
  const logout = async () => {
    try {
      await logoutUser();
      dispatch({ type: 'AUTH_LOGOUT' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '로그아웃에 실패했습니다.';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      throw error;
    }
  };

  // 비밀번호 재설정 함수
  const resetPassword = async (email: string) => {
    dispatch({ type: 'AUTH_START' });
    try {
      await resetUserPassword(email);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '비밀번호 재설정에 실패했습니다.';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      throw error;
    }
  };

  // 프로필 업데이트 함수
  const updateProfile = async (data: ProfileUpdateFormData) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('로그인이 필요합니다.');
      }
      await updateUserProfile(currentUser, data);
      dispatch({ type: 'AUTH_SUCCESS', payload: currentUser as User });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '프로필 업데이트에 실패했습니다.';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      throw error;
    }
  };

  // 에러 초기화 함수
  const resetError = () => {
    dispatch({ type: 'AUTH_RESET_ERROR' });
  };

  // Context 값 정의
  const value: AuthContextType = {
    currentUser: state.user,
    loading: state.loading,
    error: state.error,
    login,
    register,
    logout,
    resetPassword,
    updateProfile,
    resetError
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};