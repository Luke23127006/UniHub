import { Link, useLoaderData } from 'react-router';
import StatusBadge from '@/components/StatusBadge';
import { workshopApi } from '../api';

export async function loader({ params }) {
  return workshopApi.getById(params.id);
}

function formatDateTime(value) {
  if (!value) return 'TBA';
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(price, currency) {
  if (!price) return 'Free';
  if (currency === 'VND') return `${price.toLocaleString('vi-VN')} VND`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
}

export default function WorkshopDetailPage() {
  const workshop = useLoaderData();

  return (
    <div className="space-y-6">
      <Link to="/" className="text-sm font-medium text-unihub-primary dark:text-unihub-gold hover:underline">
        Back to workshops
      </Link>

      <section className="rounded-xl border border-unihub-border dark:border-gray-700 bg-unihub-card dark:bg-gray-800 p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-unihub-text dark:text-gray-100">{workshop.title}</h1>
            <p className="mt-2 text-sm text-unihub-muted dark:text-gray-400">{workshop.description}</p>
          </div>
          <StatusBadge status={workshop.status} />
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-semibold uppercase text-unihub-muted dark:text-gray-400">Time</dt>
            <dd className="mt-1 text-sm">{formatDateTime(workshop.start_time)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-unihub-muted dark:text-gray-400">Room</dt>
            <dd className="mt-1 text-sm">
              {workshop.room?.room_code} - {workshop.room?.building}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-unihub-muted dark:text-gray-400">Seats</dt>
            <dd className="mt-1 text-sm">
              {workshop.available_seats}/{workshop.capacity} available
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-unihub-muted dark:text-gray-400">Price</dt>
            <dd className="mt-1 text-sm font-semibold">{formatPrice(workshop.price, workshop.currency)}</dd>
          </div>
        </dl>

        <div className="mt-6">
          <h2 className="text-sm font-semibold text-unihub-text dark:text-gray-100">Speakers</h2>
          <ul className="mt-2 space-y-2 text-sm text-unihub-muted dark:text-gray-400">
            {(workshop.speakers || []).map((speaker) => (
              <li key={speaker.full_name}>
                <span className="font-medium text-unihub-text dark:text-gray-200">{speaker.full_name}</span>
                {speaker.title ? `, ${speaker.title}` : ''}
                {speaker.organization ? ` - ${speaker.organization}` : ''}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
