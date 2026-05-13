import MyTicketPage from './pages/MyTicketPage';
import TicketDetailPage, { loader as TicketDetailLoader } from './pages/TicketDetailPage';
import RegistrationPage, { loader as RegistrationLoader } from './pages/RegistrationPage';

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
  {
    path: 'workshops/:id/register',
    element: <RegistrationPage />,
    loader: RegistrationLoader,
  },
];
