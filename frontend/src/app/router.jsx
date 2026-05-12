import { createBrowserRouter } from 'react-router';
import ErrorPage from '@/components/ErrorPage';
import { workshopRoutes } from '@/features/workshop/routes';
import RootLayout from './layouts/RootLayout';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [...workshopRoutes],
  },
]);
