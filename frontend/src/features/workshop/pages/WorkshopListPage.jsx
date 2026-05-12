import { useLoaderData } from 'react-router';
import { workshopApi } from '../api';
import WorkshopDashboard from '../WorkshopDashboard';

export async function loader() {
  return workshopApi.list();
}

export default function WorkshopListPage() {
  const workshops = useLoaderData();
  return <WorkshopDashboard workshops={workshops} />;
}
