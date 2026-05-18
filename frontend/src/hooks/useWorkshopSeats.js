import { useEffect, useState } from 'react';

export function useWorkshopSeats() {
  const [seatMap, setSeatMap] = useState({});

  useEffect(() => {
    const es = new EventSource('/api/v1/workshops/sse/seat-updates');

    es.onmessage = (e) => {
      try {
        const { workshopId, availableSeats } = JSON.parse(e.data);
        setSeatMap((prev) => ({ ...prev, [workshopId]: availableSeats }));
      } catch {
        // ignore malformed frames
      }
    };

    return () => {
      es.close();
    };
  }, []);

  return seatMap;
}
