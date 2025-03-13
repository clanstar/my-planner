import { useState } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { 
  LayoutGrid, 
  Calendar, 
  Target, 
  CheckSquare, 
  Book, 
  Menu,
  X,
  User,
  LogOut
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function MainLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { currentUser, logout } = useAuth();

  const navigation = [
    { name: '목표', to: '/', icon: Target },
    { name: '할 일', to: '/todos', icon: CheckSquare },
    { name: '다이어리', to: '/diary', icon: Book },
    { name: '달력', to: '/calendar', icon: Calendar },
    { name: '대시보드', to: '/dashboard', icon: LayoutGrid },
  ];

  const getPageTitle = () => {
    const route = navigation.find(item => item.to === location.pathname);
    return route?.name || (location.pathname === '/profile' ? '내 프로필' : '404');
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('로그아웃 중 오류 발생:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 모바일 헤더 */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <h1 className="text-xl font-semibold">플래너</h1>
          <div className="flex items-center gap-2">
            <Link to="/profile" className="p-2 rounded-full hover:bg-gray-100">
              <User className="w-6 h-6" />
            </Link>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>
  
      {/* 모바일 메뉴 */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="absolute top-0 right-0 w-64 h-full bg-white shadow-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <h1 className="text-xl font-semibold">플래너</h1>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {currentUser && (
              <div className="p-4 border-b">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">{currentUser.displayName || '사용자'}</p>
                    <p className="text-gray-500 text-xs">{currentUser.email}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="overflow-y-auto h-full p-4 pb-20">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg ${
                        isActive
                          ? 'bg-blue-50 text-blue-600'
                          : 'hover:bg-gray-100'
                      }`
                    }
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </NavLink>
                );
              })}
              <Link
                to="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                  location.pathname === '/profile'
                    ? 'bg-blue-50 text-blue-600'
                    : 'hover:bg-gray-100'
                }`}
              >
                <User className="w-5 h-5" />
                내 프로필
              </Link>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-50 w-full text-left"
              >
                <LogOut className="w-5 h-5" />
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}
  
      <div className="flex">
        {/* 데스크톱 사이드바 */}
        <div className="hidden lg:block w-64 min-h-screen bg-white border-r fixed">
          <div className="p-6">
            <h1 className="text-xl font-semibold">플래너</h1>
            {currentUser && (
              <div className="mt-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-sm">
                  <p className="font-medium">{currentUser.displayName || '사용자'}</p>
                  <p className="text-gray-500 text-xs">{currentUser.email}</p>
                </div>
              </div>
            )}
          </div>
          <nav className="px-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg ${
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'hover:bg-gray-100'
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </NavLink>
              );
            })}
            <div className="pt-4 border-t mt-4">
              <Link
                to="/profile"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                  location.pathname === '/profile'
                    ? 'bg-blue-50 text-blue-600'
                    : 'hover:bg-gray-100'
                }`}
              >
                <User className="w-5 h-5" />
                내 프로필
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-50 w-full text-left"
              >
                <LogOut className="w-5 h-5" />
                로그아웃
              </button>
            </div>
          </nav>
        </div>
  
        {/* 메인 콘텐츠 영역 */}
        <main className={`flex-1 w-full ${!isMobileMenuOpen ? "lg:ml-64" : ""}`}>
          {/* 모바일 페이지 제목 */}
          <div className="lg:hidden py-4 px-6 border-b bg-white">
            <h1 className="text-lg font-medium">{getPageTitle()}</h1>
          </div>
          
          {/* 페이지 컨텐츠 */}
          <div className="p-4 lg:p-8">
            <div className="hidden lg:block mb-6">
              <h1 className="text-2xl font-semibold">{getPageTitle()}</h1>
            </div>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}