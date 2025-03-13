import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import CalendarPage from './pages/CalendarPage';
import GoalsPage from './pages/GoalsPage';
import TodoPage from './pages/TodoPage';
import DiaryPage from './pages/DiaryPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PasswordResetPage from './pages/PasswordResetPage';
import ProfilePage from './pages/ProfilePage';
import MainLayout from './layouts/MainLayout';
import { PlannerProvider } from './store/PlannerContext';
import { AuthProvider } from './store/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

const router = createBrowserRouter([
  // 인증이 필요하지 않은 공개 라우트
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/register',
    element: <RegisterPage />
  },
  {
    path: '/reset-password',
    element: <PasswordResetPage />
  },
  // 인증이 필요한 보호된 라우트
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <GoalsPage />
      },
      {
        path: 'calendar',
        element: <CalendarPage />
      },
      {
        path: 'dashboard',
        element: <DashboardPage />
      },
      {
        path: 'todos',
        element: <TodoPage />
      },
      {
        path: 'diary',
        element: <DiaryPage />
      },
      {
        path: 'profile',
        element: <ProfilePage />
      }
    ]
  }
]);

export default function App() {
  return (
    <AuthProvider>
      <PlannerProvider>
        <RouterProvider router={router} />
      </PlannerProvider>
    </AuthProvider>
  );
}