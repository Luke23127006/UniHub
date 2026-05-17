import { Navigate, redirect } from 'react-router';
import AdminLayout from './components/AdminLayout';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import WorkshopManagement from './pages/WorkshopManagement';

/**
 * Route protection for Admin only
 */
const adminLoader = () => {
  const user = JSON.parse(localStorage.getItem('auth_user') || '{}');
  if (user.role !== 'Admin') {
    return redirect('/');
  }
  return null;
};

export const adminRoutes = [
  {
    path: 'admin',
    element: <AdminLayout />,
    loader: adminLoader,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <AnalyticsDashboard /> },
      { path: 'workshops', element: <WorkshopManagement /> },
    ],
  },
];

export default adminRoutes;
