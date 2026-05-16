import { useState, useCallback } from 'react';
import * as Network from 'expo-network';
import { jwtDecode } from 'jwt-decode';
import { getDb } from '@/shared/utils/db';
import { apiClient } from '@/shared/api/api-client';

export interface CheckinResult {
  success: boolean;
  message: string;
  studentName?: string;
  studentCode?: string;
}

export const useCheckin = () => {
  const [isSyncing, setIsSyncing] = useState(false);

  /**
   * Pre-fetch all valid tickets for a workshop and store in local SQLite.
   */
  const syncTicketsFromServer = useCallback(async (workshopId: string) => {
    setIsSyncing(true);
    try {
      const response = await apiClient.get(`/v1/checkin/workshop/${workshopId}/tickets`);
      if (response.ok && Array.isArray(response.data)) {
        const db = await getDb();
        
        // Use a transaction for bulk insert
        await db.withTransactionAsync(async () => {
          // Clear old tickets for this workshop (optional, or just update)
          await db.runAsync('DELETE FROM tickets WHERE wid = ?', [workshopId]);
          
          for (const ticket of response.data) {
            await db.runAsync(
              'INSERT INTO tickets (tid, wid, uid, student_code, student_name, status) VALUES (?, ?, ?, ?, ?, ?)',
              [ticket.tid, workshopId, ticket.uid, ticket.sid, ticket.name, ticket.checked_in ? 1 : 0]
            );
          }
        });
        return { success: true, count: response.data.length };
      }
      return { success: false, error: response.error };
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      setIsSyncing(false);
    }
  }, []);

  /**
   * Validates a scanned QR (JWT) and records check-in locally.
   */
  const performCheckin = useCallback(async (qrData: string, currentWorkshopId: string): Promise<CheckinResult> => {
    try {
      console.log('--- DEBUG SCAN ---');
      console.log('Raw Data:', qrData);
      console.log('Current Workshop ID:', currentWorkshopId);

      // 1. Decode JWT (Basic offline validation)
      const decoded: any = jwtDecode(qrData);
      console.log('Decoded Payload:', decoded);

      const { tid, wid } = decoded;

      if (wid !== currentWorkshopId) {
        return { 
          success: false, 
          message: `Sai Workshop!\nQR: ${wid}\nApp: ${currentWorkshopId}` 
        };
      }

      const db = await getDb();

      // 2. Check local DB for ticket status
      const ticket: any = await db.getFirstAsync('SELECT * FROM tickets WHERE tid = ?', [tid]);
      
      if (!ticket) {
        return { 
          success: false, 
          message: `Vé (ID: ${tid}) không có trong danh sách tải về của Workshop này.` 
        };
      }

      if (ticket.status === 1) {
        return { success: false, message: 'Vé đã được check-in trước đó', studentName: ticket.student_name };
      }

      // 3. Update local DB and Sync Queue
      const timestamp = new Date().toISOString();
      await db.withTransactionAsync(async () => {
        await db.runAsync('UPDATE tickets SET status = 1, checkin_time = ? WHERE tid = ?', [timestamp, tid]);
        await db.runAsync('INSERT OR IGNORE INTO sync_queue (tid, client_timestamp) VALUES (?, ?)', [tid, timestamp]);
      });

      return { 
        success: true, 
        message: 'Check-in thành công!', 
        studentName: ticket.student_name,
        studentCode: ticket.student_code 
      };
    } catch (error: any) {
      console.error('Check-in Error:', error);
      return { 
        success: false, 
        message: `Mã QR không hợp lệ:\n${error.message || 'Sai định dạng JWT'}` 
      };
    }
  }, []);

  /**
   * Uploads all unsynced check-ins from the local queue to the server.
   */
  const syncCheckinsToServer = useCallback(async () => {
    const networkState = await Network.getNetworkStateAsync();
    if (!networkState.isConnected) return;

    const db = await getDb();
    const unsynced: any[] = await db.getAllAsync('SELECT * FROM sync_queue WHERE synced = 0');
    
    if (unsynced.length === 0) return;

    setIsSyncing(true);
    try {
      const response = await apiClient.post('/v1/checkin/sync', {
        checkins: unsynced.map(u => ({ tid: u.tid, client_timestamp: u.client_timestamp })),
        deviceId: 'mobile-device-placeholder' // In real app use Constants.deviceId or similar
      });

      if (response.ok) {
        // Mark as synced in local DB
        await db.withTransactionAsync(async () => {
          for (const item of unsynced) {
            await db.runAsync('UPDATE sync_queue SET synced = 1 WHERE id = ?', [item.id]);
          }
        });
      }
    } catch (error) {
      console.error('Sync Error:', error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return {
    isSyncing,
    syncTicketsFromServer,
    performCheckin,
    syncCheckinsToServer
  };
};
