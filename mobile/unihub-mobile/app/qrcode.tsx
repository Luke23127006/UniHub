import { useLocalSearchParams, useRouter } from 'expo-router';
import QRCodeScanner from '@/features/qrcode/components/QRCodeScanner';
import { useWorkshop } from '@/features/workshop/context/WorkshopContext';

export default function QRCodeRoute() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { workshops } = useWorkshop();
  
  const workshop = workshops.find(w => w.id === id);

  return (
    <QRCodeScanner 
      title={workshop?.title} 
      onBack={() => router.back()} 
    />
  );
}
