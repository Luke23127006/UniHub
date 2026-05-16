import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';

/**
 * UTILITY SCRIPT: Reset App Data
 */
export const resetAppData = async () => {
  console.log('--- [ResetDB] Starting full data wipe ---');

  try {
    // 1. Wipe SQLite Database (Modern Expo SQLite v16+ way)
    try {
      await SQLite.deleteDatabaseAsync('unihub_checkin.db');
      console.log('✅ [ResetDB] SQLite Database (unihub_checkin.db) deleted.');
    } catch (e) {
      console.log('ℹ️ [ResetDB] Database not found.');
    }

    // 2. Wipe SecureStore
    const authKeys = ['auth_token', 'user_data', 'idempotency_keys'];
    for (const key of authKeys) {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (e) {}
    }
    console.log('✅ [ResetDB] SecureStore cleared.');

    console.log('--- [ResetDB] Wipe completed. ---');
    return true;
  } catch (error) {
    console.error('❌ [ResetDB] Error during wipe:', error);
    return false;
  }
};
