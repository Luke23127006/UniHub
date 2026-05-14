import { createBrowserRouter, Link, redirect } from 'react-router';
import ErrorPage from '@/components/ErrorPage';
import { authRoutes } from '@/features/auth/routes';
import { workshopRoutes } from '@/features/workshop/routes';
import { registrationRoutes } from '@/features/registration/routes';
import RootLayout from './layouts/RootLayout';

function requireAuth() {
  if (!localStorage.getItem('auth_token')) {
    return redirect('/login');
  }
  return null;
}

function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-unihub-bg dark:bg-gray-950 text-unihub-text dark:text-gray-100 flex items-center justify-center px-4">
      <section className="max-w-md w-full rounded-xl border border-unihub-border dark:border-gray-700 bg-unihub-card dark:bg-gray-800 p-6 shadow-sm">
        <h1 className="text-xl font-bold">403 Forbidden</h1>
        <p className="mt-2 text-sm text-unihub-muted dark:text-gray-400">You do not have permission to access this page.</p>
        <Link to="/" className="inline-flex mt-5 rounded-lg bg-unihub-primary px-4 py-2 text-sm font-semibold text-white hover:bg-unihub-primary-hover">
          Back to workshops
        </Link>
      </section>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-unihub-bg dark:bg-gray-950 text-unihub-text dark:text-gray-100 flex items-center justify-center px-4">
      <section className="max-w-md w-full rounded-xl border border-unihub-border dark:border-gray-700 bg-unihub-card dark:bg-gray-800 p-6 shadow-sm">
        <h1 className="text-xl font-bold">404 Not Found</h1>
        <p className="mt-2 text-sm text-unihub-muted dark:text-gray-400">The page you are looking for does not exist.</p>
        <Link to="/" className="inline-flex mt-5 rounded-lg bg-unihub-primary px-4 py-2 text-sm font-semibold text-white hover:bg-unihub-primary-hover">
          Back to workshops
        </Link>
      </section>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      ...workshopRoutes,
      ...authRoutes,
      {
        loader: requireAuth,
        children: registrationRoutes,
      },
      { path: '403', element: <ForbiddenPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
