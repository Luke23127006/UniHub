import { useEffect, useRef, useState } from 'react';

/**
 * Connects to the SSE seat-updates stream and returns a map of
 * { [workshopId]: availableSeats } that is updated in real time.
 */
export function useWorkshopSeats() {
  const [seatMap, setSeatMap] = useState({});
  const esRef = useRef(null);

  useEffect(() => {
    const es = new EventSource('/api/v1/workshops/sse/seat-updates');
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const { workshopId, availableSeats } = JSON.parse(e.data);
        setSeatMap((prev) => ({ ...prev, [workshopId]: availableSeats }));
      } catch {
        // ignore malformed frames
      }
    };

    es.onerror = () => {
      // Browser auto-reconnects; nothing to do here
    };

    return () => {
      es.close();
    };
  }, []);

  return seatMap;
}
