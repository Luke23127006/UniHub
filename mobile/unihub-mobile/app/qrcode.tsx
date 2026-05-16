import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import QRCodeScanner from '@/features/qrcode/components/QRCodeScanner';
import { MOCK_WORKSHOPS } from '@/features/workshop/constants/mock-data';

export default function QRCodeRoute() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const workshop = MOCK_WORKSHOPS.find(w => w.id === id);

  return (
    <QRCodeScanner 
      title={workshop?.title} 
      onBack={() => router.back()} 
    />
  );
}
