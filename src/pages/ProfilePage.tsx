import { LogOut } from 'lucide-react';
import UserProfile from '../components/auth/UserProfile';
import { useAuth } from '../hooks/useAuth';

export default function ProfilePage() {
  const { logout } = useAuth();
  
  const handleLogout = async () => {
    try {
      await logout();
      // 로그아웃 후 로그인 페이지로 리디렉션은 ProtectedRoute에서 처리됨
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">내 프로필</h1>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>로그아웃</span>
        </button>
      </div>
      
      <UserProfile />
    </div>
  );
}