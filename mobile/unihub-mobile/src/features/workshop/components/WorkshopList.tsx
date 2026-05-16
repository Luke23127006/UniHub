import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, FlatList, TextInput, Dimensions, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { useWorkshop } from '../context/WorkshopContext';
import { WorkshopCard } from './WorkshopCard';
import { StatusBar } from 'expo-status-bar';
import { Workshop } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function WorkshopList() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { workshops, totalWorkshops, ongoingCount, isLoading, fetchWorkshops, selectWorkshop } = useWorkshop();
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchWorkshops();
  }, [fetchWorkshops]);

  const handleSelectWorkshop = (workshop: Workshop) => {
    selectWorkshop(workshop);
    router.push(`/qrcode?id=${workshop.id}`);
  };

  const filteredWorkshops = useMemo(() => {
    return workshops.filter(w => 
      w.title.toLowerCase().includes(search.toLowerCase()) ||
      w.room.toLowerCase().includes(search.toLowerCase())
    );
  }, [workshops, search]);

  const headerComponent = useMemo(() => (
    <View style={styles.headerContainer}>
      <ThemedText style={styles.screenTitle}>WORKSHOP LIST</ThemedText>
      <ThemedText style={styles.screenSubtitle}>CHOOSE A SESSION TO START CHECK-IN</ThemedText>
      
      <View style={styles.searchWrapper}>
        <IconSymbol name="magnifyingglass" size={20} color="#64748B" />
        <TextInput
          style={styles.searchInput}
          placeholder="SEARCH WORKSHOPS..."
          placeholderTextColor="#475569"
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          spellCheck={false}
        />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <ThemedText style={styles.statLabel}>TOTAL</ThemedText>
          <ThemedText style={styles.statValue}>{totalWorkshops}</ThemedText>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <ThemedText style={styles.statLabel}>ONGOING</ThemedText>
          <ThemedText style={[styles.statValue, { color: '#22D3EE' }]}>
            {ongoingCount}
          </ThemedText>
        </View>
      </View>
    </View>
  ), [totalWorkshops, ongoingCount, search]);

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.gridContainer}>
        {[...Array(20)].map((_, i) => <View key={`h-${i}`} style={[styles.gridLineH, { top: (SCREEN_HEIGHT / 20) * i }]} />)}
        {[...Array(15)].map((_, i) => <View key={`v-${i}`} style={[styles.gridLineV, { left: (SCREEN_WIDTH / 15) * i }]} />)}
      </View>

      <FlatList
        data={filteredWorkshops}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <WorkshopCard 
            workshop={item} 
            onPress={() => handleSelectWorkshop(item)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchWorkshops}
            tintColor="#22D3EE"
            colors={["#22D3EE"]}
          />
        }
        ListHeaderComponent={headerComponent}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  gridContainer: { ...StyleSheet.absoluteFillObject, opacity: 0.15 },
  gridLineH: { 
    position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#007AFF',
    shadowColor: '#007AFF', shadowRadius: 4, shadowOpacity: 0.5
  },
  gridLineV: { 
    position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#007AFF',
    shadowColor: '#007AFF', shadowRadius: 4, shadowOpacity: 0.5
  },
  listContent: {
    paddingHorizontal: 24,
  },
  headerContainer: {
    marginBottom: 32,
  },
  screenTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
    marginBottom: 8,
    paddingTop: 10,
    textShadowColor: 'rgba(0, 122, 255, 0.8)',
    textShadowRadius: 10,
  },
  screenSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 2,
    marginBottom: 24,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});
