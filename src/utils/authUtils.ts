import { User } from 'firebase/auth';

// 로컬 스토리지 키
const AUTH_USER_KEY = 'auth_user';
const AUTH_TOKEN_KEY = 'auth_token';

// Firebase User를 로컬 스토리지에 저장 (직렬화 가능한 정보만)
export const saveUserToLocalStorage = (user: User | null): void => {
  if (user) {
    // User 객체에서 직렬화 가능한 정보만 추출
    const serializableUser = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
      createdAt: user.metadata.creationTime,
      lastLoginAt: user.metadata.lastSignInTime
    };
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(serializableUser));
  } else {
    localStorage.removeItem(AUTH_USER_KEY);
  }
};

// 로컬 스토리지에서 사용자 기본 정보 가져오기
export const getUserFromLocalStorage = () => {
  const userStr = localStorage.getItem(AUTH_USER_KEY);
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Failed to parse user from localStorage:', error);
      return null;
    }
  }
  return null;
};

// 인증 토큰 저장
export const saveAuthToken = (token: string): void => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
};

// 인증 토큰 가져오기
export const getAuthToken = (): string | null => {
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

// 인증 토큰 삭제
export const removeAuthToken = (): void => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

// 로그아웃 시 사용자 관련 데이터 정리
export const clearAuthData = (): void => {
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

// 인증 관련 오류 메시지 변환
export const getAuthErrorMessage = (error: any): string => {
  const errorCode = error?.code || '';
  
  // Firebase 인증 오류 코드에 따른 사용자 친화적인 메시지
  switch (errorCode) {
    case 'auth/user-not-found':
      return '등록되지 않은 이메일 주소입니다.';
    case 'auth/wrong-password':
      return '비밀번호가 올바르지 않습니다.';
    case 'auth/invalid-credential':
      return '로그인 정보가 올바르지 않습니다.';
    case 'auth/email-already-in-use':
      return '이미 사용 중인 이메일 주소입니다.';
    case 'auth/weak-password':
      return '비밀번호가 너무 약합니다. 최소 6자 이상의 비밀번호를 사용해주세요.';
    case 'auth/operation-not-allowed':
      return '해당 로그인 방식이 현재 비활성화되어 있습니다.';
    case 'auth/invalid-email':
      return '유효하지 않은 이메일 형식입니다.';
    case 'auth/account-exists-with-different-credential':
      return '이미 다른 로그인 방식으로 가입된 이메일입니다.';
    case 'auth/popup-closed-by-user':
      return '로그인 팝업이 닫혔습니다. 다시 시도해주세요.';
    case 'auth/network-request-failed':
      return '네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인해주세요.';
    case 'auth/too-many-requests':
      return '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.';
    case 'auth/user-disabled':
      return '해당 계정은 비활성화되었습니다. 관리자에게 문의하세요.';
    case 'auth/requires-recent-login':
      return '민감한 작업을 위해 재로그인이 필요합니다.';
    default:
      return error?.message || '인증 과정에서 오류가 발생했습니다.';
  }
};

// 이메일 유효성 검사
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// 비밀번호 유효성 검사 (최소 6자 이상)
export const isValidPassword = (password: string): boolean => {
  return password.length >= 6;
};

// 디스플레이 이름 유효성 검사 (2자 이상)
export const isValidDisplayName = (displayName: string): boolean => {
  return displayName.trim().length >= 2;
};