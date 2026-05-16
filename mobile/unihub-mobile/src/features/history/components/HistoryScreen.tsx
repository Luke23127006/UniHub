import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  FlatList, 
  TextInput, 
  Dimensions, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { StatusBar } from 'expo-status-bar';
import * as Network from 'expo-network';
import { HistoryCard } from './HistoryCard';
import { HistoryService } from '../services/HistoryService';
import { CheckInHistory } from '../types';
import { useCheckin } from '@/features/qrcode/hooks/useCheckin';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PAGE_SIZE = 15;

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { syncCheckinsToServer, isSyncing: isSyncingStore } = useCheckin();
  
  const [data, setData] = useState<CheckInHistory[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'synced' | 'pending'>('all');
  
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ all: 0, synced: 0, pending: 0 });
  const [isConnected, setIsConnected] = useState(true);

  const fetchId = useRef(0);

  const loadData = useCallback(async (pageNum: number, isInitial: boolean = false) => {
    if (pageNum > 1 && !hasMore) return;
    
    const currentFetchId = ++fetchId.current;
    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    try {
      const result = await HistoryService.getHistory(pageNum, PAGE_SIZE, search, filter);
      if (currentFetchId === fetchId.current) {
        if (isInitial) {
          setData(result.data);
          setPage(1);
        } else {
          setData(prev => [...prev, ...result.data]);
          setPage(pageNum);
        }
        setHasMore(result.hasMore);
        setTotal(result.total);
        setCounts(result.counts);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
      if (pageNum > 1) setHasMore(false);
    } finally {
      if (currentFetchId === fetchId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [search, filter, hasMore]);

  // Initial load or search/filter change
  useEffect(() => {
    loadData(1, true);
  }, [search, filter, loadData]);

  // Auto-sync and network monitoring
  useEffect(() => {
    const checkNetwork = async () => {
      const state = await Network.getNetworkStateAsync();
      setIsConnected(!!state.isConnected);
    };

    checkNetwork();

    const interval = setInterval(async () => {
      const state = await Network.getNetworkStateAsync();
      const wasDisconnected = !isConnected;
      setIsConnected(!!state.isConnected);
      
      // Auto-sync when internet restored
      if (wasDisconnected && state.isConnected) {
        console.log('[AutoSync] Internet restored, syncing...');
        await syncCheckinsToServer();
        loadData(1, true);
      }
    }, 5000); // Check every 5s

    return () => clearInterval(interval);
  }, [isConnected, syncCheckinsToServer, loadData]);

  useEffect(() => {
    const initialSync = async () => {
      await syncCheckinsToServer();
      loadData(1, true);
    };
    initialSync();
  }, []);

  const handleSync = async () => {
    if (!isConnected) {
        console.log('Cannot sync while offline');
        return;
    }
    await syncCheckinsToServer(true); // Force re-sync all
    loadData(1, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading && data.length > 0) {
      loadData(page + 1, false);
    }
  };

  const renderFooter = () => {
    if (!loadingMore) return <View style={{ height: 20 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color="#007AFF" />
        <ThemedText style={styles.loaderText}>LOADING MORE RECORDS...</ThemedText>
      </View>
    );
  };

  const headerComponent = (
    <View style={styles.headerContainer}>
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.screenTitle}>CHECK-IN HISTORY</ThemedText>
          <ThemedText style={styles.screenSubtitle}>MANAGE AND SYNC ATTENDANCE RECORDS</ThemedText>
        </View>
        <TouchableOpacity 
          style={[styles.syncBtn, isSyncingStore && styles.syncBtnDisabled]} 
          onPress={handleSync}
          disabled={isSyncingStore}
        >
          {isSyncingStore ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <IconSymbol name="arrow.triangle.2.circlepath" size={20} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>
      
      {!isConnected && (
        <View style={styles.offlineBadge}>
          <IconSymbol name="wifi.slash" size={12} color="#F59E0B" />
          <ThemedText style={styles.offlineText}>OFFLINE MODE • SHOWING LOCAL DATA</ThemedText>
        </View>
      )}

      <View style={styles.searchWrapper}>
        <IconSymbol name="magnifyingglass" size={20} color="#64748B" />
        <TextInput
          style={styles.searchInput}
          placeholder="SEARCH STUDENT OR WORKSHOP..."
          placeholderTextColor="#475569"
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          spellCheck={false}
        />
      </View>

      <View style={styles.statsRow}>
        <TouchableOpacity 
          style={[styles.statItem, filter === 'synced' && styles.statActiveSynced]} 
          onPress={() => setFilter(filter === 'synced' ? 'all' : 'synced')}
        >
          <ThemedText style={[styles.statLabel, filter === 'synced' && { color: '#10B981' }]}>SYNCED</ThemedText>
          <ThemedText style={[styles.statValue, { color: '#10B981' }]}>
            {counts.synced}
          </ThemedText>
        </TouchableOpacity>
        
        <View style={styles.statDivider} />
        
        <TouchableOpacity 
          style={[styles.statItem, filter === 'pending' && styles.statActivePending]} 
          onPress={() => setFilter(filter === 'pending' ? 'all' : 'pending')}
        >
          <ThemedText style={[styles.statLabel, filter === 'pending' && { color: '#F59E0B' }]}>PENDING</ThemedText>
          <ThemedText style={[styles.statValue, { color: '#F59E0B' }]}>
            {counts.pending}
          </ThemedText>
        </TouchableOpacity>
      </View>

      {filter !== 'all' && (
        <TouchableOpacity onPress={() => setFilter('all')} style={styles.clearFilter}>
          <ThemedText style={styles.clearFilterText}>Showing {filter} items • Clear Filter</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.gridContainer}>
        {[...Array(20)].map((_, i) => <View key={`h-${i}`} style={[styles.gridLineH, { top: (SCREEN_HEIGHT / 20) * i }]} />)}
        {[...Array(15)].map((_, i) => <View key={`v-${i}`} style={[styles.gridLineV, { left: (SCREEN_WIDTH / 15) * i }]} />)}
      </View>

      {loading && data.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <ThemedText style={styles.loadingText}>INITIALIZING DATA...</ThemedText>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <HistoryCard item={item} />}
          ListHeaderComponent={headerComponent}
          ListFooterComponent={renderFooter}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 100 }
          ]}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <IconSymbol name="tray" size={48} color="#1E293B" />
              <ThemedText style={styles.emptyText}>NO RECORDS FOUND</ThemedText>
            </View>
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  gridContainer: { ...StyleSheet.absoluteFillObject, opacity: 0.1 },
  gridLineH: { 
    position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#007AFF',
    shadowColor: '#007AFF', shadowRadius: 4, shadowOpacity: 0.5
  },
  gridLineV: { 
    position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#007AFF',
    shadowColor: '#007AFF', shadowRadius: 4, shadowOpacity: 0.5
  },
  listContent: { paddingHorizontal: 24 },
  headerContainer: { marginBottom: 24 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 10, marginBottom: 8 },
  screenTitle: { fontSize: 26, fontWeight: '900', color: '#FFFFFF', letterSpacing: 3, marginBottom: 8 },
  screenSubtitle: { fontSize: 9, fontWeight: '800', color: '#64748B', letterSpacing: 1.5, marginBottom: 12 },
  syncBtn: { 
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#007AFF', 
    justifyContent: 'center', alignItems: 'center', shadowColor: '#007AFF', shadowRadius: 10, shadowOpacity: 0.5 
  },
  syncBtnDisabled: { backgroundColor: '#1E293B', opacity: 0.6 },
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center', height: 50, backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', marginBottom: 16,
  },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginLeft: 12 },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 14, paddingVertical: 8, paddingHorizontal: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
  statActiveSynced: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)', borderWidth: 1 },
  statActivePending: { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.2)', borderWidth: 1 },
  statLabel: { fontSize: 8, fontWeight: '800', color: '#475569', letterSpacing: 1, marginBottom: 2 },
  statValue: { fontSize: 18, fontWeight: '900' },
  statDivider: { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 4 },
  clearFilter: { marginTop: 12, alignItems: 'center' },
  clearFilterText: { fontSize: 10, color: '#007AFF', fontWeight: '700', textDecorationLine: 'underline' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 16 },
  emptyText: { fontSize: 12, color: '#334155', fontWeight: '800', letterSpacing: 2 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { color: '#64748B', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  footerLoader: { paddingVertical: 20, alignItems: 'center', gap: 8 },
  loaderText: { color: '#475569', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  offlineText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 1,
  },
});
