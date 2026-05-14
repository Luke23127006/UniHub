import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { QRBoundingBox } from '@/components/ui/QRBoundingBox';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function QRCodeScanner() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [bounds, setBounds] = useState<BarcodeScanningResult['bounds'] | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [zoom, setZoom] = useState(0); // Standard state for zoom
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      // Sensitivity: change scale to zoom range
      const newZoom = zoom + (event.scale - 1) * 0.05;
      const clampedZoom = Math.max(0, Math.min(newZoom, 1));
      runOnJS(setZoom)(clampedZoom);
    });

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (result.data) {
      setScannedData(result.data);
      setBounds(result.bounds);
      setIsScanning(false); // Pause scanning until user taps "Scan Again"

      // Clear any pending auto-hide timer
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!permission) {
    return <ThemedView style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.permissionContainer}>
          <IconSymbol name="camera.fill" size={64} color="#8E8E93" />
          <ThemedText type="title" style={styles.permissionTitle}>Camera Access</ThemedText>
          <ThemedText style={styles.permissionText}>
            We need your permission to show the camera for scanning QR codes.
          </ThemedText>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
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
              barcodeTypes: ['qr'],
            }}
            zoom={zoom}
          />

          {/* Overlay UI */}
          <View 
            style={[styles.overlay, { paddingTop: insets.top + 60 }]} 
            pointerEvents="none"
          >
            <ThemedText type="subtitle" style={styles.hint}>
              Align QR code within the frame
            </ThemedText>
          </View>

          <QRBoundingBox bounds={bounds} data={scannedData ?? undefined} />

          {/* Zoom Indicator */}
          <View style={[styles.zoomContainer, { bottom: insets.bottom + 140 }]}>
            <View style={styles.zoomBadge}>
              <Text style={styles.zoomText}>{Math.round(zoom * 10 + 1) / 10}x</Text>
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
              <Text style={styles.rescanText}>Tap to Scan Again</Text>
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
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  permissionTitle: {
    marginTop: 16,
    textAlign: 'center',
  },
  permissionText: {
    textAlign: 'center',
    color: '#8E8E93',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 28,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 60,
  },
  hint: {
    color: '#FFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  rescanButton: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  rescanText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  zoomContainer: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
  },
  zoomBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  zoomText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

