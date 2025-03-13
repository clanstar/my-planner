import { useLocation, useNavigate } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';
import { useAuth } from '../hooks/useAuth';
import { useEffect } from 'react';

export default function LoginPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // location.state에서 from 값 가져오기 (ProtectedRoute에서 설정)
  const from = location.state?.from || '/';
  
  // 이미 로그인된 경우 리디렉션
  useEffect(() => {
    if (currentUser) {
      navigate(from, { replace: true });
    }
  }, [currentUser, navigate, from]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <LoginForm redirectPath={from} />
      </div>
    </div>
  );
}