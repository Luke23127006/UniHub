import { createBrowserRouter } from 'react-router';
import ErrorPage from '@/components/ErrorPage';
import { authRoutes } from '@/features/auth/routes';
import { workshopRoutes } from '@/features/workshop/routes';
import { registrationRoutes } from '@/features/registration/routes';
import { adminRoutes } from '@/features/admin/routes';
import RootLayout from './layouts/RootLayout';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      ...workshopRoutes,
      ...authRoutes,
      ...registrationRoutes,
    ],
  },
  // Separate Admin layout to avoid nested navigation bars
  ...adminRoutes,
  {
    path: '*',
    element: <NotFoundPage />,
  }
]);
