import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckInHistory } from '../types';

interface HistoryCardProps {
  item: CheckInHistory;
}

export const HistoryCard = ({ item }: HistoryCardProps) => {
  const isSynced = item.status === 'synced';
  const date = new Date(item.timestamp);
  const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
        style={styles.cardGrad}
      >
        <View style={styles.topRow}>
          <View style={styles.studentInfo}>
            <ThemedText style={styles.studentName}>{item.studentName}</ThemedText>
            <ThemedText style={styles.studentId}>{item.studentId}</ThemedText>
          </View>
          <View style={[styles.statusTag, isSynced ? styles.statusSynced : styles.statusPending]}>
            <View style={[styles.statusDot, { backgroundColor: isSynced ? '#10B981' : '#F59E0B' }]} />
            <ThemedText style={[styles.statusText, { color: isSynced ? '#10B981' : '#F59E0B' }]}>
              {item.status.toUpperCase()}
            </ThemedText>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.bottomRow}>
          <View style={styles.workshopInfo}>
            <IconSymbol name="graduationcap.fill" size={14} color="#64748B" />
            <ThemedText style={styles.workshopTitle} numberOfLines={1}>
              {item.workshopTitle}
            </ThemedText>
          </View>
          <View style={styles.timeInfo}>
            <IconSymbol name="clock.fill" size={12} color="#64748B" />
            <ThemedText style={styles.timeText}>{timeString}</ThemedText>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    marginBottom: 16,
    shadowColor: '#007AFF',
    shadowRadius: 10,
    shadowOpacity: 0.1,
  },
  cardGrad: {
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  studentId: {
    fontSize: 12,
    fontWeight: '700',
    color: '#007AFF',
    letterSpacing: 1,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusSynced: {
    borderColor: 'rgba(16, 185, 129, 0.2)',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  statusPending: {
    borderColor: 'rgba(245, 158, 11, 0.2)',
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workshopInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  workshopTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginLeft: 6,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginLeft: 4,
  },
});
