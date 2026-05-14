import { MOCK_WORKSHOPS } from './data/mockWorkshops';

function normalizeWorkshopList(data) {
  if (Array.isArray(data)) return data.map(normalizeWorkshop);
  if (Array.isArray(data?.workshops)) return data.workshops.map(normalizeWorkshop);
  if (Array.isArray(data?.data)) return data.data.map(normalizeWorkshop);
  return [];
}

function normalizeWorkshop(workshop) {
  const capacity = Number(workshop?.capacity ?? 0);
  const availableSeats = Number(workshop?.available_seats ?? workshop?.availableSeats ?? capacity);
  const startTime = workshop?.start_time ?? workshop?.startTime ?? workshop?.event_day ?? workshop?.eventDay;
  const endTime = workshop?.end_time ?? workshop?.endTime ?? startTime;

  return {
    id: workshop?.id,
    title: workshop?.title ?? 'Untitled workshop',
    description: workshop?.description ?? '',
    status: workshop?.status ?? 'draft',
    is_paid: Boolean(workshop?.is_paid ?? workshop?.isPaid),
    price: workshop?.price ?? null,
    currency: workshop?.currency ?? null,
    capacity,
    available_seats: availableSeats,
    event_day: workshop?.event_day ?? workshop?.eventDay ?? startTime,
    start_time: startTime,
    end_time: endTime,
    room: workshop?.room ?? { room_code: 'TBA', name: 'To be announced', building: 'TBA' },
    speakers: Array.isArray(workshop?.speakers) ? workshop.speakers : [],
  };
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw response;
  return response.json();
}

export const workshopApi = {
  async list(params) {
    const query = new URLSearchParams(params || {}).toString();

    try {
      const data = await fetchJson(`/api/v1/workshops${query ? `?${query}` : ''}`);
      return normalizeWorkshopList(data);
    } catch (error) {
      console.warn('Using mock workshop data because /api/v1/workshops is unavailable.', error);
      return MOCK_WORKSHOPS;
    }
  },

  async getById(id) {
    try {
      return normalizeWorkshop(await fetchJson(`/api/v1/workshops/${id}`));
    } catch (error) {
      const workshop = MOCK_WORKSHOPS.find((item) => String(item.id) === String(id));
      if (workshop) return normalizeWorkshop(workshop);
      throw new Response('Workshop not found', { status: 404, statusText: 'Not Found' });
    }
  },
};
