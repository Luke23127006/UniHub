import { useLoaderData } from 'react-router';
import { workshopApi } from '../api';
import WorkshopDashboard from '../WorkshopDashboard';

export async function loader({ request }) {
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  
  // Only pass status if it exists and is not 'all'
  const params = {};
  if (status && status !== 'all') {
    params.status = status;
  }
  
  return workshopApi.list(params);
}

export default function WorkshopListPage() {
  const { workshops, meta } = useLoaderData();
  return <WorkshopDashboard workshops={workshops} meta={meta} />;
}
