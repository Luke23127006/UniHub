import React from 'react';
import { View, Button, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useQRCodeScanner } from '../hooks';

export default function QRCodeScanner() {
  const { isScanning, scanResult, handleScan } = useQRCodeScanner();

  return (
    <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <ThemedText type="title" style={{ marginBottom: 20 }}>QR Code Scanner</ThemedText>
      
      {isScanning ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : (
        <Button title="Simulate Scan" onPress={() => handleScan('mock-qr-data')} />
      )}

      {scanResult && (
        <View style={{ marginTop: 20, alignItems: 'center' }}>
          <ThemedText type="subtitle">Scan Result:</ThemedText>
          <ThemedText>Status: {scanResult.success ? 'Success' : 'Failed'}</ThemedText>
          {scanResult.message && <ThemedText>Message: {scanResult.message}</ThemedText>}
        </View>
      )}
    </ThemedView>
  );
}
