# Requirement: Frontend Routing Organization

## 1. Context

UniHub frontend is a small-to-medium React app for a 1-week project. Frontend is not the main technical focus; the priority is to deliver a working UI for:

- Workshop listing and detail.
- Student registration flow.
- Admin workshop management.
- Basic auth/role-based access UI.
- Integration points with backend APIs.

The current frontend is a Vite React SPA. Do not migrate the project to a new full-stack framework unless explicitly requested.

## 2. Decision

Use **React Router Data Mode** with `createBrowserRouter` and `RouterProvider`.

Do not use full React Router Framework Mode for this project.

Reasoning:

- React Router can now be used in three modes: Declarative, Data, and Framework.
- Framework Mode is a real framework mode, not just "close to a framework". It adds a Vite plugin, route modules, type-safe route APIs, intelligent code splitting, and SPA/SSR/static rendering strategies.
- However, Framework Mode changes project conventions more deeply and is not necessary for a short 1-week project where frontend is not the main focus.
- Data Mode gives the most useful improvements with low migration cost: route-level loaders, actions, pending UI, error boundaries, redirects, and cleaner page components.

## 3. Goals

The AI must implement routing so that:

- Routes are easy to find by feature.
- Pages do not become "God Components".
- API calls are not scattered inside random `useEffect` blocks.
- Adding a new page usually touches only 2-4 files.
- Small features stay small; do not create empty folders just to follow architecture.
- The app remains a simple Vite SPA that can be finished quickly.

## 4. Required Dependencies

Install React Router if missing:

```bash
npm install react-router
```

Use imports from `react-router` for v7-style code.

If the project already uses `react-router-dom`, keep it only if migration cost is not worth it. For new code, prefer `react-router`.

## 5. Target Folder Structure

Use this structure:

```text
frontend/src/
├── app/
│   ├── router.jsx          # createBrowserRouter + route composition
│   ├── providers.jsx       # global providers such as ThemeProvider
│   └── layouts/
│       └── RootLayout.jsx  # Navbar, main layout, Outlet
├── components/             # shared UI components
├── hooks/                  # shared hooks
├── services/               # shared API client/base HTTP helpers
└── features/
    └── workshop/
        ├── routes.jsx      # workshop route definitions
        ├── api.js          # workshop API calls
        ├── loaders.js      # optional; only if loaders become non-trivial
        ├── actions.js      # optional; only if route actions are needed
        ├── pages/
        │   ├── WorkshopListPage.jsx
        │   └── WorkshopDetailPage.jsx
        └── components/
```

Rules:

- A feature must own its route definitions in `features/<feature>/routes.jsx`.
- `app/router.jsx` only composes routes from features.
- Do not create `loaders/`, `actions/`, or `services/` folders by default. Use simple files first: `api.js`, `loaders.js`, `actions.js`.
- Split into folders only when a file becomes too large or the feature clearly needs multiple modules.

## 6. Router Composition

Create a top-level router in `src/app/router.jsx`:

```jsx
import { createBrowserRouter } from 'react-router';
import RootLayout from './layouts/RootLayout';
import ErrorPage from '@/components/ErrorPage';
import { workshopRoutes } from '@/features/workshop/routes';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      ...workshopRoutes,
    ],
  },
]);
```

Update `main.jsx` to render:

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from '@/app/router';
import { AppProviders } from '@/app/providers';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>
);
```

## 7. Layout Requirement

Move global layout from `App.jsx` into `RootLayout.jsx`.

`RootLayout` must render:

```jsx
import { Outlet } from 'react-router';
import Navbar from '@/components/Navbar';

export default function RootLayout() {
  return (
    <div className="min-h-screen bg-unihub-bg dark:bg-gray-950 text-unihub-text dark:text-gray-100 transition-colors duration-200">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
```

After migration, `App.jsx` should be removed if it is no longer needed.

## 8. Feature Route Pattern

Each feature must expose route definitions from `features/<feature>/routes.jsx`.

Example:

```jsx
import WorkshopListPage, { loader as workshopListLoader } from './pages/WorkshopListPage';
import WorkshopDetailPage, { loader as workshopDetailLoader } from './pages/WorkshopDetailPage';

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
```

For this project, colocating simple loaders in the page file is allowed:

```jsx
import { useLoaderData } from 'react-router';
import { workshopApi } from '../api';

export async function loader() {
  return workshopApi.list();
}

export default function WorkshopListPage() {
  const workshops = useLoaderData();
  return <WorkshopList workshops={workshops} />;
}
```

Move loaders to `loaders.js` only when:

- The loader is reused by multiple routes.
- The loader contains branching business logic.
- The page file becomes hard to scan.

## 9. API Layer Requirement

Feature API calls must be centralized in `features/<feature>/api.js`.

Example:

```js
export const workshopApi = {
  async list(params) {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`/api/workshops${query ? `?${query}` : ''}`);
    if (!response.ok) throw response;
    return response.json();
  },

  async getById(id) {
    const response = await fetch(`/api/workshops/${id}`);
    if (!response.ok) throw response;
    return response.json();
  },
};
```

Rules:

- Do not call backend APIs directly from deeply nested UI components.
- Components receive data through props.
- Route pages may call `useLoaderData`.
- Shared HTTP setup can live in `src/services/apiClient.js` if needed.

## 10. Data Loading Rules

Prefer route loaders for page-level data:

- Workshop list.
- Workshop detail.
- Admin edit page initial data.
- Current user/session bootstrap if needed.

Use component state for local UI only:

- Search input text.
- Filter dropdown state.
- Modal open/close state.
- View mode toggle.

Do not move every small interaction into React Router. Keep local UI local.

## 11. Mutation Rules

For forms that navigate after success, prefer route `action`.

Good candidates:

- Create workshop.
- Update workshop.
- Cancel workshop.
- Register for workshop.

For small button interactions that should not navigate, `useFetcher` can be used if it keeps the page simpler.

Do not introduce a large client-state library unless the feature truly needs it.

## 12. Error And Pending UI

Implement one shared `ErrorPage` for route errors.

Use `useNavigation` in `RootLayout` or page-level components to show simple pending state during navigation or form submission.

Keep pending UI simple:

- Disable submit button while submitting.
- Show short loading text or skeleton for route transitions.
- Avoid complex global loading systems.

## 13. Route Inventory

Maintain a short route inventory in this file when adding major pages:

| Route | Feature | Page | Data source | Status |
| --- | --- | --- | --- | --- |
| `/` | workshop | `WorkshopListPage` | loader -> `workshopApi.list` | done |
| `/workshops/:id` | workshop | `WorkshopDetailPage` | loader -> `workshopApi.getById` | done |
| `/login` | auth | `LoginPage` | action | done |
| `/my-tickets` | registration | `MyTicketPage` | loader -> `ticketApi.list` | done |
| `/my-tickets/:id` | registration | `TicketDetailPage` | loader -> `ticketApi.getById` | done |
| `/workshops/:id/register` | registration | `RegistrationPage` | loader + action | done |
| `/checkout/:paymentId` | registration | `CheckoutPage` | loader + action | done |
| `/payment/success` | registration | `PaymentSuccessPage` | — | done |
| `/payment/failure` | registration | `PaymentFailurePage` | — | done |
| `/403` | error | `ForbiddenPage` | — | done |
| `*` | error | `NotFoundPage` | — | done |
| `/admin/workshops` | admin/workshop | `AdminWorkshopListPage` | loader | planned |
| `/admin/workshops/new` | admin/workshop | `WorkshopCreatePage` | action | planned |
| `/admin/workshops/:id/edit` | admin/workshop | `WorkshopEditPage` | loader + action | planned |

When implementing a route, update `Status` to `done`.

This inventory prevents duplicate pages and helps the team quickly see what exists.

## 14. What Not To Do

Do not:

- Migrate to React Router Framework Mode during this project unless explicitly approved.
- Add SSR/SSG/RSC.
- Create many empty architecture folders.
- Put all route declarations in a giant central file.
- Put all feature logic in `App.jsx`.
- Fetch page data in `useEffect` when a route loader is a better fit.
- Mix admin, auth, and workshop logic in one feature folder.

## 15. Acceptance Criteria

The routing implementation is acceptable when:

- `main.jsx` uses `RouterProvider`.
- `app/router.jsx` composes feature route arrays.
- Each major feature has its own `routes.jsx`.
- `RootLayout` owns shared layout and renders `Outlet`.
- Page-level API reads use loaders.
- Mutating forms use actions where practical.
- Adding a simple new page requires only:
  - one page file,
  - one route entry in that feature,
  - optionally one API function.
- The route inventory is updated.
- The app still runs with `npm run dev` and builds with `npm run build`.
