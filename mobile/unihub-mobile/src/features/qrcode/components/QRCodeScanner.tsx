import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { QRBoundingBox } from '@/components/ui/QRBoundingBox';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCheckin } from '../hooks/useCheckin';
import { initDatabase } from '@/shared/utils/db';
import { useLocalSearchParams } from 'expo-router';

interface QRCodeScannerProps {
  title?: string;
  onBack?: () => void;
}

export default function QRCodeScanner({ title, onBack }: QRCodeScannerProps) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const { id: workshopId } = useLocalSearchParams();
  const { performCheckin, syncTicketsFromServer, syncCheckinsToServer, isSyncing } = useCheckin();
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [bounds, setBounds] = useState<BarcodeScanningResult["bounds"] | null>(
    null,
  );
  const [isScanning, setIsScanning] = useState(true);
  const [zoom, setZoom] = useState(0); 
  const isProcessing = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize DB and Pre-fetch
  useEffect(() => {
    const setup = async () => {
      await initDatabase();
      if (workshopId) {
        await syncTicketsFromServer(workshopId as string);
        await syncCheckinsToServer();
      }
    };
    setup();
  }, [workshopId]);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      // Sensitivity: change scale to zoom range
      const newZoom = zoom + (event.scale - 1) * 0.05;
      const clampedZoom = Math.max(0, Math.min(newZoom, 1));
      runOnJS(setZoom)(clampedZoom);
    });

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (isProcessing.current || !isScanning) return;
    
    if (result.data) {
      isProcessing.current = true;
      setScannedData(result.data);
      setBounds(result.bounds);
      setIsScanning(false); 

      // Perform local check-in
      const checkinResult = await performCheckin(result.data, (workshopId as string) || '');

      if (checkinResult.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        Alert.alert(
          'CHECK-IN THÀNH CÔNG',
          `Sinh viên: ${checkinResult.studentName}\nMSV: ${checkinResult.studentCode}`,
          [
            { 
              text: 'TIẾP TỤC', 
              onPress: () => {
                isProcessing.current = false;
                setIsScanning(true);
                setScannedData(null);
                setBounds(null);
                syncCheckinsToServer(); // Try to sync in background
              } 
            }
          ]
        );
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        Alert.alert('LỖI CHECK-IN', checkinResult.message, [
          { 
            text: 'THỬ LẠI', 
            onPress: () => {
              isProcessing.current = false;
              setIsScanning(true);
              setScannedData(null);
              setBounds(null);
            } 
          }
        ]);
      }

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  };

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
    return () => {
      if (currentTimeout) clearTimeout(currentTimeout);
    };
  }, [permission?.granted, requestPermission]);

  if (!permission) {
    return <ThemedView style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.permissionContainer}>
          <IconSymbol name="camera.fill" size={64} color="#007AFF" />
          <ThemedText type="title" style={styles.permissionTitle}>Camera Access</ThemedText>
          <ThemedText style={styles.permissionText}>
            Cần quyền truy cập Camera để quét mã QR điểm danh.
          </ThemedText>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Cấp quyền</Text>
          </TouchableOpacity>
          {onBack && (
            <TouchableOpacity style={{ marginTop: 20 }} onPress={onBack}>
              <Text style={{ color: '#64748B' }}>Quay lại</Text>
            </TouchableOpacity>
          )}
        </View>
      </ThemedView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={pinchGesture}>
        <ThemedView style={styles.container}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
            zoom={zoom}
          />

          {/* New Top Bar with Back Button and Title */}
          <View style={[styles.topBar, { paddingTop: insets.top + 10, backgroundColor: 'rgba(0,0,0,0.8)' }]}>
            {onBack && (
              <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                <IconSymbol name="chevron.left" size={24} color="#FFF" />
              </TouchableOpacity>
            )}
            <View style={styles.headerText}>
              <ThemedText style={styles.subTitle}>CHECK-IN TERMINAL</ThemedText>
              <ThemedText style={styles.title} numberOfLines={1}>
                {title || 'QUÉT MÃ SINH VIÊN'}
              </ThemedText>
            </View>
          </View>

          {/* Overlay UI */}
          <View 
            style={[styles.overlay, { top: insets.top + 100 }]} 
            pointerEvents="none"
          >
            <ThemedText type="subtitle" style={styles.hint}>
              CĂN CHỈNH MÃ QR VÀO KHUNG
            </ThemedText>
          </View>

          <QRBoundingBox bounds={bounds ?? undefined} data={scannedData ?? undefined} />

          {/* Zoom Indicator */}
          <View style={[styles.zoomContainer, { bottom: insets.bottom + 140 }]}>
            <View style={styles.zoomBadge}>
              <Text style={styles.zoomText}>
                {Math.round(zoom * 10 + 1) / 10}x
              </Text>
            </View>
          </View>

          {/* Scanner Toggle / Reset */}
          {!isScanning && (
            <TouchableOpacity
              style={[styles.rescanButton, { bottom: insets.bottom + 60 }]}
              onPress={() => {
                setScannedData(null);
                setBounds(null);
                setIsScanning(true);
              }}
            >
              <IconSymbol name="qrcode.viewfinder" size={24} color="#FFF" />
              <Text style={styles.rescanText}>Chạm để quét lại</Text>
            </TouchableOpacity>
          )}
        </ThemedView>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    gap: 16,
  },
  permissionTitle: {
    marginTop: 16,
    textAlign: "center",
  },
  permissionText: {
    textAlign: "center",
    color: "#8E8E93",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 28,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "600",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 60,
  },
  hint: {
    color: "#FFF",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerText: { flex: 1 },
  subTitle: { fontSize: 9, fontWeight: '800', color: '#007AFF', letterSpacing: 1.5 },
  title: { fontSize: 16, fontWeight: '900', color: '#FFF', marginTop: 2 },
  rescanButton: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerText: { flex: 1 },
  subTitle: { fontSize: 9, fontWeight: '800', color: '#007AFF', letterSpacing: 1.5 },
  title: { fontSize: 16, fontWeight: '900', color: '#FFF', marginTop: 2 },
  rescanButton: {
    position: "absolute",
    bottom: 50,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  rescanText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "500",
  },
  zoomContainer: {
    position: "absolute",
    bottom: 120,
    alignSelf: "center",
  },
  zoomBadge: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  zoomText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
