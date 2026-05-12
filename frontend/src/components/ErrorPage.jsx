import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

export default function ErrorPage() {
  const error = useRouteError();

  const title = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'Something went wrong';

  const message = isRouteErrorResponse(error)
    ? error.data?.message || 'The requested page could not be loaded.'
    : error?.message || 'Please try again from the workshop dashboard.';

  return (
    <div className="min-h-screen bg-unihub-bg dark:bg-gray-950 text-unihub-text dark:text-gray-100 flex items-center justify-center px-4">
      <section className="max-w-md w-full rounded-xl border border-unihub-border dark:border-gray-700 bg-unihub-card dark:bg-gray-800 p-6 shadow-sm">
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-unihub-muted dark:text-gray-400">{message}</p>
        <Link
          to="/"
          className="inline-flex mt-5 rounded-lg bg-unihub-primary px-4 py-2 text-sm font-semibold text-white hover:bg-unihub-primary-hover"
        >
          Back to workshops
        </Link>
      </section>
    </div>
  );
}
