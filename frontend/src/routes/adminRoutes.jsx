import { Navigate, Route } from 'react-router-dom';
import AdminLayout from '@/features/admin/components/AdminLayout';
import AnalyticsDashboard from '@/features/admin/pages/AnalyticsDashboard';
import WorkshopManagement from '@/features/admin/pages/WorkshopManagement';

/**
 * All routes nested under /admin.
 * Index redirects to /admin/dashboard so the sidebar always has an active item.
 * Consumed as a child of <Routes> in App.jsx.
 */
const AdminRoutes = (
  <Route path="/admin" element={<AdminLayout />}>
    <Route index element={<Navigate to="dashboard" replace />} />
    <Route path="dashboard" element={<AnalyticsDashboard />} />
    <Route path="workshops" element={<WorkshopManagement />} />
  </Route>
);

export default AdminRoutes;
