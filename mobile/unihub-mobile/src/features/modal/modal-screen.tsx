import { StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ModalScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Modal Screen</ThemedText>
      <ThemedView style={styles.separator} />
      <ThemedText>
        This is a placeholder for the modal screen. You can customize this in{' '}
        <ThemedText type="defaultSemiBold">src/features/modal/modal-screen.tsx</ThemedText>
      </ThemedText>

      {/* Use a light status bar on iOS to account for the black space above the modal */}
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
    backgroundColor: '#eee',
  },
});
