import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import WorkshopDashboard from '@/features/workshop/WorkshopDashboard';
import AdminRoutes from '@/routes/adminRoutes';

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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StudentShell />} />
        {AdminRoutes}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
