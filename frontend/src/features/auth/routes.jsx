import LoginPage, { action as loginAction } from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';

export const authRoutes = [
  {
    path: 'login',
    element: <LoginPage />,
    action: loginAction,
  },
  {
    path: 'profile',
    element: <ProfilePage />,
  },
];
