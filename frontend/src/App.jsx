import Navbar from '@/components/Navbar';
import WorkshopDashboard from '@/features/workshop/WorkshopDashboard';

export default function App() {
  return (
    <div className="min-h-screen bg-unihub-bg dark:bg-gray-950 text-unihub-text dark:text-gray-100 transition-colors duration-200">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <WorkshopDashboard />
      </main>
    </div>
  );
}
