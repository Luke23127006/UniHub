import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
  useWindowDimensions,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  interpolate,
  Easing,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/shared/hooks/use-auth';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const { setLoggedIn } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Shared Values for Animations
  const rot1 = useSharedValue(0);
  const rot2 = useSharedValue(0);
  const rot3 = useSharedValue(0);
  const gridPulse = useSharedValue(0);
  const corePulse = useSharedValue(1);
  const entrance = useSharedValue(0);

  useEffect(() => {
    rot1.value = withRepeat(withTiming(1, { duration: 8000, easing: Easing.linear }), -1, false);
    rot2.value = withRepeat(withTiming(1, { duration: 12000, easing: Easing.linear }), -1, false);
    rot3.value = withRepeat(withTiming(1, { duration: 16000, easing: Easing.linear }), -1, false);
    gridPulse.value = withRepeat(withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }), -1, true);
    corePulse.value = withRepeat(withTiming(1.1, { duration: 2500, easing: Easing.inOut(Easing.ease) }), -1, true);
    entrance.value = withSpring(1, { damping: 20, stiffness: 80 });
  }, []);

  const orbit1Anim = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot1.value * 360}deg` }] }));
  const orbit2Anim = useAnimatedStyle(() => ({ transform: [{ rotate: `${-rot2.value * 360}deg` }] }));
  const orbit3Anim = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot3.value * 360}deg` }] }));
  const gridAnim = useAnimatedStyle(() => ({ opacity: interpolate(gridPulse.value, [0, 1], [0.1, 0.25]) }));
  const coreAnim = useAnimatedStyle(() => ({ transform: [{ scale: corePulse.value }] }));
  const entranceAnimStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [{ translateY: interpolate(entrance.value, [0, 1], [20, 0]) }]
  }));

  const handleLogin = () => {
    if (!email || !password) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setLoggedIn(true);
    }, 1500);
  };

  // Static Grid to prevent re-calculation crashes on iOS
  const GridLines = useMemo(() => (
    <View style={StyleSheet.absoluteFill}>
      {[...Array(15)].map((_, i) => (
        <View key={`h-${i}`} style={[styles.gridH, { top: `${(i * 100) / 15}%` }]} />
      ))}
      {[...Array(10)].map((_, i) => (
        <View key={`v-${i}`} style={[styles.gridV, { left: `${(i * 100) / 10}%` }]} />
      ))}
    </View>
  ), []);

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="light" />

      <Animated.View style={[styles.gridContainer, gridAnim]}>
        {GridLines}
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.avoidingView}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
            <Animated.View style={[styles.header, entranceAnimStyle]}>
              <View style={styles.coreWrapper}>
                <Animated.View style={[styles.orbitLayer, orbit1Anim]}>
                  <View style={[styles.orbit, styles.orbitOuter]} />
                </Animated.View>
                <Animated.View style={[styles.orbitLayer, orbit2Anim]}>
                  <View style={[styles.orbit, styles.orbitMiddle]} />
                </Animated.View>
                <Animated.View style={[styles.orbitLayer, orbit3Anim]}>
                  <View style={[styles.orbit, styles.orbitInner]} />
                </Animated.View>

                <Animated.View style={[styles.hub, coreAnim]}>
                  <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.hubGrad}>
                    <IconSymbol name="hexagon.fill" size={50} color="#FFF" />
                    <View style={styles.hubIcon}>
                      <IconSymbol name="graduationcap.fill" size={24} color="#007AFF" />
                    </View>
                  </LinearGradient>
                </Animated.View>
              </View>

              <View style={styles.titleStack}>
                <ThemedText style={styles.title}>UNIHUB STAFF</ThemedText>
                <View style={styles.dash} />
                <ThemedText style={styles.subtitle}>CAMPUS WORKSHOP TERMINAL</ThemedText>
              </View>
            </Animated.View>

            <Animated.View style={[styles.card, entranceAnimStyle]}>
              <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.02)']} style={styles.cardGrad}>
                <View style={styles.field}>
                  <ThemedText style={styles.label}>STAFF EMAIL</ThemedText>
                  <View style={styles.inputBox}>
                    <IconSymbol name="person.fill" size={18} color="#475569" />
                    <TextInput
                      style={styles.input}
                      placeholder="ENTER EMAIL..."
                      placeholderTextColor="#334155"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                </View>

                <View style={styles.field}>
                  <ThemedText style={styles.label}>PASSWORD</ThemedText>
                  <View style={styles.inputBox}>
                    <IconSymbol name="key.fill" size={18} color="#475569" />
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      placeholderTextColor="#334155"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.btn, (!email || !password) && styles.btnOff]}
                  onPress={handleLogin}
                  disabled={isLoading || !email || !password}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <View style={styles.btnContent}>
                      <ThemedText style={styles.btnText}>LOGIN</ThemedText>
                      <IconSymbol name="chevron.right" size={16} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>

            <View style={styles.footer}>
              <ThemedText style={styles.footerText}>
                UNIHUB // ACADEMIC SYSTEM // v2.2.1
              </ThemedText>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  gridContainer: { ...StyleSheet.absoluteFillObject },
  gridH: {
    position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#007AFF',
    opacity: 0.3, shadowColor: '#007AFF', shadowRadius: 4, shadowOpacity: 0.5
  },
  gridV: {
    position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#007AFF',
    opacity: 0.3, shadowColor: '#007AFF', shadowRadius: 4, shadowOpacity: 0.5
  },
  avoidingView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, paddingHorizontal: 32, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 20 },
  coreWrapper: { width: 180, height: 180, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  orbitLayer: { position: 'absolute', width: 180, height: 180, justifyContent: 'center', alignItems: 'center' },
  orbit: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#22D3EE', opacity: 0.6 },
  orbitOuter: { width: 170, height: 170, borderRadius: 85 },
  orbitMiddle: { width: 130, height: 130, borderRadius: 65, borderColor: '#38BDF8' },
  orbitInner: { width: 90, height: 90, borderRadius: 45, borderColor: '#FFF' },
  hub: {
    width: 70, height: 70, borderRadius: 35, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#007AFF', shadowRadius: 20, shadowOpacity: 0.5, elevation: 10
  },
  hubGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hubIcon: { position: 'absolute' },
  titleStack: { alignItems: 'center' },
  title: {
    fontSize: 26, fontWeight: '900', color: '#FFF', letterSpacing: 4,
    textShadowColor: '#007AFF', textShadowRadius: 10
  },
  dash: { width: 30, height: 2, backgroundColor: '#007AFF', marginVertical: 10 },
  subtitle: { fontSize: 8, color: '#38BDF8', fontWeight: '800', letterSpacing: 2 },
  card: {
    borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(15,23,42,0.9)', shadowColor: '#007AFF', shadowRadius: 15, shadowOpacity: 0.3
  },
  cardGrad: { padding: 20, gap: 15 },
  field: { gap: 6 },
  label: { fontSize: 8, fontWeight: '800', color: '#94A3B8', letterSpacing: 1 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', height: 48, backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
  },
  input: { flex: 1, color: '#FFF', fontSize: 14, marginLeft: 10 },
  btn: {
    height: 50, backgroundColor: '#007AFF', borderRadius: 12, justifyContent: 'center',
    alignItems: 'center', marginTop: 10, shadowColor: '#007AFF', shadowRadius: 10, shadowOpacity: 0.5
  },
  btnOff: { backgroundColor: '#1E293B', shadowOpacity: 0 },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnText: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  footer: { marginTop: 'auto', paddingTop: 40, alignItems: 'center' },
  footerText: { color: '#334155', fontSize: 8, fontWeight: '800', letterSpacing: 1.5 },
});
