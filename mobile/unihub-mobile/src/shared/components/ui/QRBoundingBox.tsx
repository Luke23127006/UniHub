import { StyleSheet, View, Text, TouchableOpacity, Linking } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from './icon-symbol';

interface QRBoundingBoxProps {
  bounds?: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
  data?: string;
  onClose?: () => void;
}

export function QRBoundingBox({ bounds, data }: QRBoundingBoxProps) {
  const boxStyle = useAnimatedStyle(() => {
    if (!bounds) return { opacity: 0 };
    return {
      left: withSpring(bounds.origin.x, { damping: 15 }),
      top: withSpring(bounds.origin.y, { damping: 15 }),
      width: withSpring(bounds.size.width, { damping: 15 }),
      height: withSpring(bounds.size.height, { damping: 15 }),
      opacity: withTiming(1, { duration: 200 }),
    };
  });

  const tooltipStyle = useAnimatedStyle(() => {
    if (!bounds) return { opacity: 0 };
    return {
      left: withSpring(bounds.origin.x + bounds.size.width / 2 - 125, { damping: 15 }), // Center relative to box
      top: withSpring(bounds.origin.y + bounds.size.height + 16, { damping: 15 }), // Below the box
      opacity: withTiming(1, { duration: 200 }),
    };
  });

  const handlePressLink = async () => {
    if (!data) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    let url = data;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      Linking.openURL(url);
    }
  };

  if (!bounds || !data) return null;

  return (
    <>
      {/* Animated Bounding Box */}
      <Animated.View style={[styles.boxContainer, boxStyle]}>
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
      </Animated.View>

      {/* Animated Tooltip (Sibling to ensure it gets touches) */}
      <Animated.View style={[styles.tooltipWrapper, tooltipStyle]}>
        <TouchableOpacity 
          style={styles.tooltip} 
          onPress={handlePressLink}
          activeOpacity={0.8}
        >
          <IconSymbol name="link" size={16} color="#007AFF" />
          <Text style={styles.tooltipText} numberOfLines={1}>
            {data}
          </Text>
          <IconSymbol name="chevron.right" size={12} color="#8E8E93" />
        </TouchableOpacity>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  boxContainer: {
    position: 'absolute',
  },
  tooltipWrapper: {
    position: 'absolute',
    width: 250, // Match maxWidth of tooltip
    alignItems: 'center',
    zIndex: 100,
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#FFD60A', // iOS Yellow
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 4,
  },
  tooltip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    maxWidth: 250,
    gap: 6,
  },
  tooltipText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
  },
});
