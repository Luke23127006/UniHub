import WorkshopDetailPage, { loader as workshopDetailLoader } from './pages/WorkshopDetailPage';
import WorkshopListPage, { loader as workshopListLoader } from './pages/WorkshopListPage';

export const workshopRoutes = [
  {
    index: true,
    element: <WorkshopListPage />,
    loader: workshopListLoader,
  },
  {
    path: 'workshops/:id',
    element: <WorkshopDetailPage />,
    loader: workshopDetailLoader,
  },
];
