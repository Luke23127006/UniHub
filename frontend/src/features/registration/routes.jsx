import MyTicketPage, { loader as MyTicketLoader } from './pages/MyTicketPage';
import TicketDetailPage, { loader as TicketDetailLoader } from './pages/TicketDetailPage';
import RegistrationPage, { loader as RegistrationLoader, action as RegistrationAction } from './pages/RegistrationPage';
import CheckoutPage, { loader as CheckoutLoader, action as CheckoutAction } from './pages/CheckoutPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentFailurePage from './pages/PaymentFailurePage';

export const registrationRoutes = [
  {
    path: 'my-tickets',
    element: <MyTicketPage />,
    loader: MyTicketLoader,
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
    action: RegistrationAction,
  },
  {
    path: 'checkout/:registrationId',
    element: <CheckoutPage />,
    loader: CheckoutLoader,
    action: CheckoutAction,
  },
  {
    path: 'payment/success',
    element: <PaymentSuccessPage />,
  },
  {
    path: 'payment/failure',
    element: <PaymentFailurePage />,
  },
];
