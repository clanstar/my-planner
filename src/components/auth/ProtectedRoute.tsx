import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectPath?: string;
}

/**
 * 인증된 사용자만 접근 가능한 라우트를 보호하는 컴포넌트
 * 
 * 인증되지 않은 사용자가 접근 시 로그인 페이지로 리디렉션합니다.
 * 로그인 후 원래 접근하려던 페이지로 돌아갈 수 있도록 location 정보를 state로 전달합니다.
 */
export default function ProtectedRoute({ 
  children, 
  redirectPath = '/login' 
}: ProtectedRouteProps) {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  // 인증 상태 확인 중일 때 로딩 표시
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // 인증되지 않은 경우 리디렉션
  if (!currentUser) {
    return (
      <Navigate 
        to={redirectPath} 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // 인증된 경우 자식 컴포넌트 렌더링
  return <>{children}</>;
}