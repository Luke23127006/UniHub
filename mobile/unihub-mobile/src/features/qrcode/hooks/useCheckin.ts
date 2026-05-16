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
  const syncTicketsFromServer = useCallback(async (workshopId: string, workshopTitle?: string) => {
    setIsSyncing(true);
    try {
      const response = await apiClient.get(`/v1/checkin/workshop/${workshopId}/tickets`);
      const db = await getDb();

      if (response.ok && Array.isArray(response.data)) {
        // Use a transaction for bulk insert
        await db.withTransactionAsync(async () => {
          // Clear old tickets for this workshop
          await db.runAsync('DELETE FROM tickets WHERE wid = ?', [workshopId]);
          
          for (const ticket of response.data) {
            await db.runAsync(
              'INSERT INTO tickets (tid, wid, uid, student_code, student_name, workshop_title, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [ticket.tid, workshopId, ticket.uid, ticket.sid, ticket.name, workshopTitle || 'Unknown Workshop', ticket.checked_in ? 1 : 0]
            );
          }
        });
        return { success: true, count: response.data.length };
      }
      
      // Fallback if API fails: Check if we already have local tickets
      const localCount: any = await db.getFirstAsync('SELECT COUNT(*) as cnt FROM tickets WHERE wid = ?', [workshopId]);
      if (localCount && localCount.cnt > 0) {
        return { success: true, count: localCount.cnt, isOffline: true };
      }

      return { success: false, error: response.error };
    } catch (error: any) {
      try {
        const db = await getDb();
        const localCount: any = await db.getFirstAsync('SELECT COUNT(*) as cnt FROM tickets WHERE wid = ?', [workshopId]);
        if (localCount && localCount.cnt > 0) {
          return { success: true, count: localCount.cnt, isOffline: true };
        }
      } catch (localErr) {
        console.error('[Sync] Local DB fallback failed:', localErr);
      }
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
        await db.runAsync(
          'INSERT OR IGNORE INTO sync_queue (tid, qr_token, client_timestamp) VALUES (?, ?, ?)', 
          [tid, qrData, timestamp]
        );
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
   * Uploads check-ins from the local queue to the server.
   * @param forceAll If true, attempts to sync all records even if marked as synced locally.
   */
  const syncCheckinsToServer = useCallback(async (forceAll: boolean = false) => {
    const networkState = await Network.getNetworkStateAsync();
    if (!networkState.isConnected) {
      console.log('[Sync] No network connection, skipping sync.');
      return;
    }

    const db = await getDb();
    const query = forceAll ? 'SELECT * FROM sync_queue' : 'SELECT * FROM sync_queue WHERE synced = 0';
    const itemsToSync: any[] = await db.getAllAsync(query);
    
    if (itemsToSync.length === 0) {
      console.log('[Sync] Nothing to sync.');
      return;
    }

    console.log(`[Sync] Starting sync for ${itemsToSync.length} records (forceAll: ${forceAll})...`);
    setIsSyncing(true);
    try {
      const response = await apiClient.post('/v1/checkin/sync', {
        checkins: itemsToSync.map(u => ({ 
          qr_token: u.qr_token, 
          tid: u.tid, // Keep tid for fallback/logging
          client_timestamp: u.client_timestamp 
        })),
        deviceId: 'mobile-staff-app'
      });

      console.log('[Sync] Response status:', response.ok ? 'OK' : 'FAILED', response.data);

      if (response.ok && response.data) {
        const { synced = 0, already_synced = 0, synced_ids = [] } = response.data;
        console.log(`[Sync] Success: ${synced}, Already synced: ${already_synced}`);

        // Mark as synced in local DB
        await db.withTransactionAsync(async () => {
          if (Array.isArray(synced_ids) && synced_ids.length > 0) {
            for (const tid of synced_ids) {
              await db.runAsync('UPDATE sync_queue SET synced = 1 WHERE tid = ?', [tid]);
            }
          } else {
            for (const item of itemsToSync) {
              await db.runAsync('UPDATE sync_queue SET synced = 1 WHERE id = ?', [item.id]);
            }
          }
        });
        console.log('[Sync] Successfully marked records as synced in local DB.');
      } else {
        console.log('[Sync] Server sync skipped or rejected:', response.error?.message || 'Offline');
      }
    } catch (error) {
      // Silent error for network failure
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
