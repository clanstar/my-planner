import { User as FirebaseUser } from 'firebase/auth';

// Firebase 사용자 타입을 확장한 커스텀 사용자 타입
export interface User extends FirebaseUser {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  createdAt?: string;
  lastLoginAt?: string;
}

// 로그인 폼 데이터 타입
export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// 회원가입 폼 데이터 타입
export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
  acceptTerms: boolean;
}

// 비밀번호 재설정 폼 데이터 타입
export interface PasswordResetFormData {
  email: string;
}

// 프로필 업데이트 폼 데이터 타입
export interface ProfileUpdateFormData {
  displayName?: string;
  photoURL?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmNewPassword?: string;
}

// 인증 컨텍스트 상태 타입
export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// 인증 컨텍스트 액션 타입
export type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'AUTH_RESET_ERROR' };

// 인증 컨텍스트 타입
export interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterFormData) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: ProfileUpdateFormData) => Promise<void>;
  resetError: () => void;
}