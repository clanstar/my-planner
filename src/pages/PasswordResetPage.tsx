import { useNavigate } from 'react-router-dom';
import PasswordResetForm from '../components/auth/PasswordResetForm';
import { useAuth } from '../hooks/useAuth';
import { useEffect } from 'react';

export default function PasswordResetPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // 이미 로그인된 경우 리디렉션
  useEffect(() => {
    if (currentUser) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <PasswordResetForm />
      </div>
    </div>
  );
}