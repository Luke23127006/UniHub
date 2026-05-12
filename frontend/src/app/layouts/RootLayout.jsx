import { Outlet, useNavigation } from 'react-router';
import Navbar from '@/components/Navbar';

export default function RootLayout() {
  const navigation = useNavigation();
  const isNavigating = navigation.state === 'loading';

  return (
    <div className="min-h-screen bg-unihub-bg dark:bg-gray-950 text-unihub-text dark:text-gray-100 transition-colors duration-200">
      <Navbar />
      {isNavigating && (
        <div className="h-1 bg-unihub-gold/30">
          <div className="h-full w-1/3 bg-unihub-gold animate-pulse" />
        </div>
      )}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
