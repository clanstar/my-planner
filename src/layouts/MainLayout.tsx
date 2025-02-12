import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutGrid, 
  Calendar, 
  Target, 
  CheckSquare, 
  Book, 
  Menu,
  X
} from 'lucide-react';

export default function MainLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: '대시보드', to: '/', icon: LayoutGrid },
    { name: '달력', to: '/calendar', icon: Calendar },
    { name: '목표', to: '/goals', icon: Target },
    { name: '할 일', to: '/todos', icon: CheckSquare },
    { name: '다이어리', to: '/diary', icon: Book },
  ];

  const getPageTitle = () => {
    const route = navigation.find(item => item.to === location.pathname);
    return route?.name || '404';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 모바일 메뉴 */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <h1 className="text-xl font-semibold">플래너</h1>
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

        {isMobileMenuOpen && (
          <nav className="fixed inset-0 z-50 bg-white">
            <div className="flex items-center justify-between p-4 border-b">
              <h1 className="text-xl font-semibold">플래너</h1>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4">
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
            </div>
          </nav>
        )}
      </div>

      {/* 데스크톱 레이아웃 */}
      <div className="hidden lg:flex">
        {/* 사이드바 */}
        <div className="w-64 min-h-screen bg-white border-r fixed">
          <div className="p-6">
            <h1 className="text-xl font-semibold">플래너</h1>
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
          </nav>
        </div>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 ml-64">
          <div className="py-6 px-8">
            <h1 className="text-2xl font-semibold mb-6">{getPageTitle()}</h1>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}