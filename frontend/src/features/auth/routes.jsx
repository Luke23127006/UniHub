import LoginPage, { action as loginAction } from './pages/LoginPage';

export const authRoutes = [
  {
    path: 'login',
    element: <LoginPage />,
    action: loginAction,
  },
];
