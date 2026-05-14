import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Workshop } from '../types';

interface WorkshopCardProps {
  workshop: Workshop;
  onPress?: () => void;
}

export function WorkshopCard({ workshop, onPress }: WorkshopCardProps) {
  const startTime = new Date(workshop.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isOngoing = new Date(workshop.start_date) <= new Date() && new Date() <= new Date(workshop.end_date);

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.cardContainer}>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)']}
        style={styles.glassBackground}
      >
        {/* Status Indicator */}
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, isOngoing ? styles.ongoingBadge : styles.upcomingBadge]}>
            <View style={[styles.statusDot, isOngoing ? styles.ongoingDot : styles.upcomingDot]} />
            <ThemedText style={styles.statusText}>{isOngoing ? 'ONGOING' : 'UPCOMING'}</ThemedText>
          </View>
          {workshop.is_paid && (
            <View style={styles.paidBadge}>
              <ThemedText style={styles.paidText}>PREMIUM</ThemedText>
            </View>
          )}
        </View>

        {/* Title */}
        <ThemedText style={styles.title}>{workshop.title}</ThemedText>

        {/* Info Row */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <IconSymbol name="location.fill" size={14} color="#64748B" />
            <ThemedText style={styles.infoText}>{workshop.room}</ThemedText>
          </View>
          <View style={styles.infoItem}>
            <IconSymbol name="clock.fill" size={14} color="#64748B" />
            <ThemedText style={styles.infoText}>{startTime}</ThemedText>
          </View>
        </View>

        {/* Check-in Progress */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <ThemedText style={styles.progressLabel}>CHECK-IN PROGRESS</ThemedText>
            <ThemedText style={styles.progressValue}>
              {workshop.checkin_count}/{workshop.available_seats}
            </ThemedText>
          </View>
          <View style={styles.progressBarBg}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${Math.min((workshop.checkin_count / workshop.available_seats) * 100, 100)}%` }
              ]} 
            />
          </View>
        </View>

        {/* Action Hint */}
        <View style={styles.actionHint}>
          <ThemedText style={styles.hintText}>TAP TO START CHECK-IN</ThemedText>
          <IconSymbol name="chevron.right" size={12} color="#007AFF" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  glassBackground: {
    padding: 20,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  ongoingBadge: {
    borderColor: 'rgba(34, 211, 238, 0.3)',
    borderWidth: 1,
  },
  upcomingBadge: {
    borderColor: 'rgba(148, 163, 184, 0.2)',
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  ongoingDot: { backgroundColor: '#22D3EE' },
  upcomingDot: { backgroundColor: '#94A3B8' },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 1,
  },
  paidBadge: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  paidText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EAB308',
    letterSpacing: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
  },
  progressValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#22D3EE',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
    shadowColor: '#007AFF',
    shadowRadius: 4,
    shadowOpacity: 0.8,
  },
  actionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    opacity: 0.8,
  },
  hintText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#007AFF',
    letterSpacing: 1,
  },
});
