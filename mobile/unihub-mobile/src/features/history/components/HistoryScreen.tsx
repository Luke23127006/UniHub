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
import { HistoryCard } from './HistoryCard';
import { HistoryService } from '../services/HistoryService';
import { CheckInHistory } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PAGE_SIZE = 15;

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<CheckInHistory[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'synced' | 'pending'>('all');
  
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  // Use a ref to track the latest filter/search to avoid unnecessary re-fetches
  const fetchId = useRef(0);

  const loadData = useCallback(async (pageNum: number, isInitial: boolean = false) => {
    const currentFetchId = ++fetchId.current;
    
    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    try {
      const result = await HistoryService.fetchHistory(pageNum, PAGE_SIZE, filter, search);
      
      // Ensure we only update if this is still the latest request
      if (currentFetchId === fetchId.current) {
        if (isInitial) {
          setData(result.data);
        } else {
          setData(prev => [...prev, ...result.data]);
        }
        setHasMore(result.hasMore);
        setTotal(result.total);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      if (currentFetchId === fetchId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [filter, search]);

  // Initial load or filter/search change
  useEffect(() => {
    setPage(1);
    loadData(1, true);
  }, [filter, search, loadData]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadData(nextPage, false);
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
      <ThemedText style={styles.screenTitle}>CHECK-IN HISTORY</ThemedText>
      <ThemedText style={styles.screenSubtitle}>MANAGE AND SYNC ATTENDANCE RECORDS</ThemedText>
      
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
            {filter === 'synced' ? total : '...'}
          </ThemedText>
        </TouchableOpacity>
        
        <View style={styles.statDivider} />
        
        <TouchableOpacity 
          style={[styles.statItem, filter === 'pending' && styles.statActivePending]} 
          onPress={() => setFilter(filter === 'pending' ? 'all' : 'pending')}
        >
          <ThemedText style={[styles.statLabel, filter === 'pending' && { color: '#F59E0B' }]}>PENDING</ThemedText>
          <ThemedText style={[styles.statValue, { color: '#F59E0B' }]}>
            {filter === 'pending' ? total : '...'}
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
  screenTitle: { fontSize: 26, fontWeight: '900', color: '#FFFFFF', letterSpacing: 3, marginBottom: 8, paddingTop: 10 },
  screenSubtitle: { fontSize: 9, fontWeight: '800', color: '#64748B', letterSpacing: 1.5, marginBottom: 24 },
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
});
