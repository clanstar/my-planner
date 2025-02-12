import { createBrowserRouter, RouterProvider, Link, useLocation } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import DashboardPage from './pages/DashboardPage';
import CalendarPage from './pages/CalendarPage';
import GoalsPage from './pages/GoalsPage';
import TodoPage from './pages/TodoPage';
import DiaryPage from './pages/DiaryPage';
import { PlannerProvider } from './store/PlannerContext';

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  
  const navigation = [
    { name: '목표', path: '/' },
    { name: '할 일', path: '/todos' },
    { name: '다이어리', path: '/diary' },
    { name: '대시보드', path: '/dashboard' },
    { name: '달력', path: '/calendar' }
  ];

  return (
    <div className="max-w-6xl mx-auto p-4">
      <header className="flex items-center gap-2 mb-6">
        <Calendar className="w-8 h-8" />
        <h1 className="text-2xl font-bold">시간 관리 앱</h1>
      </header>

      <nav className="flex border-b mb-4">
        {navigation.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex-1 px-4 py-2 text-sm font-medium text-center ${
              location.pathname === item.path
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {item.name}
          </Link>
        ))}
      </nav>

      <main>{children}</main>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout><GoalsPage /></Layout>
  },
  {
    path: '/todos',
    element: <Layout><TodoPage /></Layout>
  },
  {
    path: '/diary',
    element: <Layout><DiaryPage /></Layout>
  },
  {
    path: '/dashboard',
    element: <Layout><DashboardPage /></Layout>
  },
  {
    path: '/calendar',
    element: <Layout><CalendarPage /></Layout>
  }
]);

export default function App() {
  return (
    <PlannerProvider>
      <RouterProvider router={router} />
    </PlannerProvider>
  );
}