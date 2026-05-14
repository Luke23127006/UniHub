import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import WorkshopDashboard from '@/features/workshop/WorkshopDashboard';
import AdminLayout from '@/features/admin/components/AdminLayout';
import AnalyticsDashboard from '@/features/admin/pages/AnalyticsDashboard';
import WorkshopManagement from '@/features/admin/pages/WorkshopManagement';

function StudentShell() {
  return (
    <div className="min-h-screen bg-unihub-bg dark:bg-gray-950 text-unihub-text dark:text-gray-100 transition-colors duration-200">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <WorkshopDashboard />
      </main>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<StudentShell />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AnalyticsDashboard />} />
        <Route path="workshops" element={<WorkshopManagement />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
