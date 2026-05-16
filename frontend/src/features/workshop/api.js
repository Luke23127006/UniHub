function normalizeWorkshopList(response) {
  // Handle the new backend format: { status: 'success', data: { data: [...] } }
  const workshops = response?.data?.data || response?.data || response?.workshops || response;
  if (Array.isArray(workshops)) return workshops.map(normalizeWorkshop);
  return [];
}

function normalizeWorkshop(workshop) {
  // Handle if workshop is wrapped in { status: 'success', data: {...} }
  const ws = workshop?.data || workshop;
  
  const capacity = Number(ws?.capacity ?? 0);
  const availableSeats = Number(ws?.available_seats ?? ws?.availableSeats ?? capacity);
  const startTime = ws?.start_time ?? ws?.startTime ?? ws?.event_day ?? ws?.eventDay;
  const endTime = ws?.end_time ?? ws?.endTime ?? startTime;

  return {
    id: ws?.id,
    title: ws?.title ?? 'Untitled workshop',
    description: ws?.description ?? '',
    status: ws?.status ?? 'draft',
    is_paid: Boolean(ws?.is_paid ?? ws?.isPaid),
    price: ws?.price ?? null,
    currency: ws?.currency ?? 'VND',
    capacity,
    available_seats: availableSeats,
    event_day: ws?.event_day ?? ws?.eventDay ?? startTime,
    start_time: startTime,
    end_time: endTime,
    room: ws?.room ?? { room_code: 'TBA', name: 'To be announced', building: 'TBA' },
    speakers: Array.isArray(ws?.speakers) ? ws.speakers : [],
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
      return {
        workshops: normalizeWorkshopList(data),
        meta: data.data // Contains total, ongoingCount, etc.
      };
    } catch (error) {
      console.error('Failed to fetch workshops from server:', error);
      throw error;
    }
  },

  async getById(id) {
    try {
      const response = await fetchJson(`/api/v1/workshops/${id}`);
      return normalizeWorkshop(response);
    } catch (error) {
      console.error(`Failed to fetch workshop ${id}:`, error);
      throw error;
    }
  },
};
