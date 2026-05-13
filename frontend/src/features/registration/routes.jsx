import MyTicketPage from './pages/MyTicketPage';
import TicketDetailPage, { loader as TicketDetailLoader } from './pages/TicketDetailPage';

export const registrationRoutes = [
  {
    path: 'my-tickets',
    element: <MyTicketPage />,
  },
  {
    path: 'my-tickets/:id',
    element: <TicketDetailPage />,
    loader: TicketDetailLoader,
  },
];
