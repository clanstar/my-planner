import { useContext } from 'react';
import { AuthContext } from '../store/AuthContext';
import { AuthContextType } from '../types/auth';

/**
 * AuthContext를 사용하기 위한 커스텀 훅
 * 
 * 이 훅은 AuthContext에서 제공하는 모든 인증 관련 상태와 함수를 제공합니다.
 * - currentUser: 현재
 * - loading: 인증 관련 작업 중인지 여부
 * - error: 인증 관련 오류 메시지
 * - login: 이메일/비밀번호로 로그인하는 함수
 * - register: 새 사용자 등록 함수
 * - logout: 로그아웃 함수
 * - resetPassword: 비밀번호 재설정 함수
 * - updateProfile: 사용자 프로필 업데이트 함수
 * - resetError: 오류 상태 초기화 함수
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};