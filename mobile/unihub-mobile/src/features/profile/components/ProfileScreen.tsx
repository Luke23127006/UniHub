import React from 'react';
import { StyleSheet, View, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { useAuth } from '@/shared/hooks/use-auth';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    Alert.alert(
      'TERMINATE ACCESS',
      'Are you sure you want to end this secure session?',
      [
        { text: 'ABORT', style: 'cancel' },
        { text: 'TERMINATE', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background Ambient Glows */}
      <View style={[styles.glow, { top: -100, left: -100, backgroundColor: '#007AFF20' }]} />
      <View style={[styles.glow, { bottom: -100, right: -100, backgroundColor: '#007AFF15' }]} />
      
      {/* Grid Background */}
      <View style={styles.gridContainer}>
        {[...Array(15)].map((_, i) => <View key={`h-${i}`} style={[styles.gridLineH, { top: (SCREEN_HEIGHT / 15) * i }]} />)}
        {[...Array(10)].map((_, i) => <View key={`v-${i}`} style={[styles.gridLineV, { left: (SCREEN_WIDTH / 10) * i }]} />)}
      </View>

      <View style={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <ThemedText style={styles.headerCode}>ACCESS_LVL: 04</ThemedText>
            <View style={styles.statusIndicator}>
              <View style={styles.statusDot} />
              <ThemedText style={styles.statusText}>ENCRYPTED</ThemedText>
            </View>
          </View>
          <ThemedText style={styles.screenTitle}>STAFF IDENTITY</ThemedText>
        </View>

        {/* Identity Card (Cyber Badge) */}
        <View style={styles.badgeContainer}>
          <LinearGradient 
            colors={['rgba(30, 41, 59, 0.8)', 'rgba(15, 23, 42, 0.95)']} 
            style={styles.badgeContent}
          >
            {/* Top Serial Code */}
            <ThemedText style={styles.serialCode}>S/N: {user?.id?.toString().slice(0, 8).toUpperCase() || 'UH-2024-X'}</ThemedText>

            <View style={styles.avatarSection}>
              <View style={styles.bioRing1}>
                <View style={styles.bioRing2}>
                  <View style={styles.avatarContainer}>
                    <ThemedText style={styles.avatarInitial}>{user?.full_name?.charAt(0) || 'S'}</ThemedText>
                  </View>
                </View>
              </View>
              <View style={styles.scanLine} />
            </View>

            <View style={styles.identityDetails}>
              <ThemedText style={styles.userName}>{user?.full_name || 'ANONYMOUS STAFF'}</ThemedText>
              <ThemedText style={styles.userRole}>{"// AUTHORIZED_PERSONNEL // "}{user?.role || 'SYSTEM_OPERATOR'}</ThemedText>
            </View>

            <View style={styles.dataGrid}>
              <View style={styles.dataChip}>
                <IconSymbol name="envelope.fill" size={12} color="#007AFF" />
                <ThemedText style={styles.chipText}>{user?.email || 'unassigned@unihub.com'}</ThemedText>
              </View>
              <View style={styles.dataChip}>
                <IconSymbol name="shield.fill" size={12} color="#007AFF" />
                <ThemedText style={styles.chipText}>AUTH_STATED: VERIFIED</ThemedText>
              </View>
            </View>
          </LinearGradient>
          
          {/* Decorative Corner Hardware */}
          <View style={[styles.cornerDetail, { top: 12, left: 12, borderTopWidth: 2, borderLeftWidth: 2 }]} />
          <View style={[styles.cornerDetail, { bottom: 12, right: 12, borderBottomWidth: 2, borderRightWidth: 2 }]} />
        </View>

        <View style={{ flex: 1 }} />

        {/* Logout Button (Danger Zone) */}
        <View style={styles.logoutWrapper}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <LinearGradient 
              colors={['#DC2626', '#7F1D1D']} 
              start={{x:0, y:0}} end={{x:1, y:1}} 
              style={styles.logoutGrad}
            >
              <ThemedText style={styles.logoutText}>TERMINATE AUTHENTICATION</ThemedText>
              <IconSymbol name="power" size={16} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
          <ThemedText style={styles.logoutHint}>Warning: All local cache will be flushed.</ThemedText>
        </View>

        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>SYSTEM_CORE_v2.5.0 // UNIHUB_NETWORK</ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  glow: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.6 },
  gridContainer: { ...StyleSheet.absoluteFillObject, opacity: 0.08 },
  gridLineH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#007AFF' },
  gridLineV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#007AFF' },
  content: { flex: 1, paddingHorizontal: 28 },
  header: { marginBottom: 32 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  headerCode: { fontSize: 10, fontWeight: '800', color: '#64748B', letterSpacing: 1 },
  statusIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(34, 197, 94, 0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  statusText: { fontSize: 8, fontWeight: '900', color: '#22C55E' },
  screenTitle: { fontSize: 24, fontWeight: '900', color: '#FFF', letterSpacing: 2 },
  badgeContainer: { 
    borderRadius: 24, padding: 1, backgroundColor: 'rgba(255,255,255,0.1)', 
    shadowColor: '#007AFF', shadowRadius: 30, shadowOpacity: 0.2,
  },
  badgeContent: { borderRadius: 23, padding: 24, alignItems: 'center' },
  serialCode: { position: 'absolute', top: 16, right: 20, fontSize: 8, fontWeight: '700', color: '#334155' },
  avatarSection: { marginBottom: 28, alignItems: 'center', justifyContent: 'center' },
  bioRing1: { width: 130, height: 130, borderRadius: 65, borderWidth: 1, borderColor: 'rgba(0,122,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  bioRing2: { width: 110, height: 110, borderRadius: 55, borderWidth: 2, borderColor: 'rgba(0,122,255,0.3)', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  avatarContainer: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#007AFF' },
  avatarInitial: { fontSize: 36, fontWeight: '900', color: '#FFF' },
  scanLine: { position: 'absolute', width: 140, height: 1, backgroundColor: '#007AFF', opacity: 0.3, transform: [{ translateY: 10 }] },
  identityDetails: { alignItems: 'center', marginBottom: 32 },
  userName: { fontSize: 22, fontWeight: '900', color: '#FFF', letterSpacing: 1 },
  userRole: { fontSize: 9, fontWeight: '800', color: '#007AFF', letterSpacing: 1.5, marginTop: 6 },
  dataGrid: { width: '100%', gap: 12 },
  dataChip: { 
    flexDirection: 'row', alignItems: 'center', gap: 10, 
    backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: 12, borderRadius: 12, 
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)',
  },
  chipText: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  cornerDetail: { position: 'absolute', width: 16, height: 16, borderColor: '#007AFF80' },
  logoutWrapper: { marginBottom: 20 },
  logoutBtn: { borderRadius: 16, overflow: 'hidden', elevation: 8, shadowColor: '#EF4444', shadowRadius: 15, shadowOpacity: 0.3 },
  logoutGrad: { height: 60, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  logoutText: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  logoutHint: { textAlign: 'center', fontSize: 9, color: '#475569', marginTop: 12, fontWeight: '600' },
  footer: { alignItems: 'center' },
  footerText: { color: '#1E293B', fontSize: 8, fontWeight: '800', letterSpacing: 1.5 },
});

