export interface QRCodeData {
  content: string;
  scannedAt: Date;
}

export interface ScanResult {
  success: boolean;
  message?: string;
}
