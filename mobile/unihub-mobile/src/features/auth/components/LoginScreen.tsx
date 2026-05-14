import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Dimensions
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setLoggedIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Shared Values
  const rot1 = useSharedValue(0);
  const rot2 = useSharedValue(0);
  const rot3 = useSharedValue(0);
  const gridPulse = useSharedValue(0);
  const corePulse = useSharedValue(1);
  const entrance = useSharedValue(0);

  useEffect(() => {
    // 1. Stable Continuous Rotations (Fixed Durations for Stability)
    rot1.value = withRepeat(withTiming(1, { duration: 8000, easing: Easing.linear }), -1, false);
    rot2.value = withRepeat(withTiming(1, { duration: 12000, easing: Easing.linear }), -1, false);
    rot3.value = withRepeat(withTiming(1, { duration: 16000, easing: Easing.linear }), -1, false);

    gridPulse.value = withRepeat(withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }), -1, true);
    corePulse.value = withRepeat(withTiming(1.1, { duration: 2500, easing: Easing.inOut(Easing.ease) }), -1, true);
    
    entrance.value = withSpring(1, { damping: 20, stiffness: 80 });
  }, []);

  // Animated Styles
  const orbit1Anim = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot1.value * 360}deg` }] }));
  const orbit2Anim = useAnimatedStyle(() => ({ transform: [{ rotate: `${-rot2.value * 360}deg` }] }));
  const orbit3Anim = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot3.value * 360}deg` }] }));

  const gridAnim = useAnimatedStyle(() => ({
    opacity: interpolate(gridPulse.value, [0, 1], [0.1, 0.25]),
  }));

  const coreAnim = useAnimatedStyle(() => ({
    transform: [{ scale: corePulse.value }],
  }));

  const entranceAnim = (delay: number) => useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [{ translateY: interpolate(entrance.value, [0, 1], [30, 0]) }]
  }));

  const handleLogin = () => {
    if (!email || !password) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setLoggedIn(true);
    }, 1500);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ThemedView style={styles.container}>
        <StatusBar style="light" />
        
        {/* Background Neon Grid */}
        <Animated.View style={[styles.grid, gridAnim]}>
          {[...Array(15)].map((_, i) => <View key={`h-${i}`} style={[styles.gridH, { top: (SCREEN_HEIGHT / 15) * i }]} />)}
          {[...Array(10)].map((_, i) => <View key={`v-${i}`} style={[styles.gridV, { left: (SCREEN_WIDTH / 10) * i }]} />)}
        </Animated.View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
          
          <Animated.View style={[styles.header, { marginTop: insets.top + 30 }, entranceAnim(0)]}>
            <View style={styles.coreWrapper}>
              {/* High-Intensity Glow Layers */}
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
                  <IconSymbol name="hexagon.fill" size={64} color="#FFF" />
                  <View style={styles.hubIcon}>
                    <IconSymbol name="graduationcap.fill" size={32} color="#007AFF" />
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

          <Animated.View style={[styles.card, entranceAnim(200)]}>
            <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.02)']} style={styles.cardGrad}>
              <View style={styles.field}>
                <ThemedText style={styles.label}>STAFF IDENTIFIER</ThemedText>
                <View style={styles.inputBox}>
                  <IconSymbol name="person.fill" size={18} color="#475569" />
                  <TextInput
                    style={styles.input}
                    placeholder="ENTER ID..."
                    placeholderTextColor="#334155"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.field}>
                <ThemedText style={styles.label}>SECURITY KEY</ThemedText>
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
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <View style={styles.btnContent}>
                    <ThemedText style={styles.btnText}>INITIATE ACCESS</ThemedText>
                    <IconSymbol name="chevron.right" size={16} color="#FFF" />
                  </View>
                )}
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>

          <View style={[styles.footer, { marginBottom: insets.bottom + 15 }]}>
            <ThemedText style={styles.footerText}>
              UNIHUB // ACADEMIC SYSTEM // v2.2.1
            </ThemedText>
          </View>

        </KeyboardAvoidingView>
      </ThemedView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  grid: { ...StyleSheet.absoluteFillObject },
  gridH: { 
    position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#007AFF', 
    shadowColor: '#007AFF', shadowOffset: { width: 0, height: 0 }, shadowRadius: 8, shadowOpacity: 1
  },
  gridV: { 
    position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#007AFF',
    shadowColor: '#007AFF', shadowOffset: { width: 0, height: 0 }, shadowRadius: 8, shadowOpacity: 1
  },
  content: { flex: 1, paddingHorizontal: 32 },
  header: { alignItems: 'center', marginBottom: 20 },
  coreWrapper: {
    width: 240, height: 240, justifyContent: 'center', alignItems: 'center', marginBottom: 40
  },
  orbitLayer: { position: 'absolute', width: 240, height: 240, justifyContent: 'center', alignItems: 'center' },
  orbit: {
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#22D3EE',
    shadowColor: '#22D3EE', shadowOffset: { width: 0, height: 0 }, shadowRadius: 15, shadowOpacity: 1
  },
  orbitOuter: { width: 230, height: 230, borderRadius: 115, opacity: 1 },
  orbitMiddle: { width: 180, height: 180, borderRadius: 90, borderColor: '#38BDF8', opacity: 1 },
  orbitInner: { width: 140, height: 140, borderRadius: 70, borderColor: '#FFF', opacity: 1 },
  hub: {
    width: 100, height: 100, borderRadius: 50, overflow: 'hidden',
    shadowColor: '#007AFF', shadowOffset: { width: 0, height: 0 }, shadowRadius: 40, elevation: 25,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)'
  },
  hubGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hubIcon: { position: 'absolute' },
  titleStack: { alignItems: 'center' },
  title: { 
    fontSize: 34, fontWeight: '900', color: '#FFF', letterSpacing: 5, lineHeight: 42,
    textShadowColor: 'rgba(0, 122, 255, 1)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20
  },
  dash: { width: 40, height: 3, backgroundColor: '#007AFF', marginVertical: 12, borderRadius: 2 },
  subtitle: { fontSize: 10, color: '#38BDF8', fontWeight: '800', letterSpacing: 3 },
  card: {
    borderRadius: 24, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(15,23,42,0.7)', shadowColor: '#007AFF', shadowRadius: 20, shadowOpacity: 0.3
  },
  cardGrad: { padding: 22, gap: 18 },
  field: { gap: 8 },
  label: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 1 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', height: 56, backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
  },
  input: { flex: 1, color: '#FFF', fontSize: 16, marginLeft: 12, fontWeight: '600' },
  btn: {
    height: 60, backgroundColor: '#007AFF', borderRadius: 16, justifyContent: 'center',
    alignItems: 'center', marginTop: 10, shadowColor: '#007AFF', shadowRadius: 20, shadowOpacity: 0.8, elevation: 15
  },
  btnOff: { backgroundColor: '#1E293B', shadowOpacity: 0 },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  btnText: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 1.5 },
  footer: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  footerText: { color: '#334155', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
});
