import { useState } from 'react';
import { validateQRCode } from './api';
import { ScanResult } from './types';

export const useQRCodeScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const handleScan = async (data: string) => {
    setIsScanning(true);
    try {
      const result = await validateQRCode(data);
      setScanResult(result);
    } catch (error) {
      setScanResult({ success: false, message: 'Failed to scan QR Code' });
    } finally {
      setIsScanning(false);
    }
  };

  return {
    isScanning,
    scanResult,
    handleScan,
  };
};
