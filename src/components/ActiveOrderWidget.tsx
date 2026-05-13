import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/typography';

interface ActiveOrderWidgetProps {
  onPress: () => void;
  timestamp: number | null;
  status?: string;
}

const ActiveOrderWidget: React.FC<ActiveOrderWidgetProps> = ({ onPress, timestamp, status }) => {
  const [scaleValue] = useState(new Animated.Value(1));

  const isDeclined = status === 'declined';
  const isCompleted = status === 'delivered';

  // Helper to format status display
  const getStatusDisplay = () => {
    if (!status || status === 'pending') return 'Confirmed';
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  };

  return (
    <Animated.View style={[
      styles.container, 
      { transform: [{ scale: scaleValue }] },
      isDeclined && { backgroundColor: Colors.error },
      isCompleted && { backgroundColor: Colors.success }
    ]}>
      <TouchableOpacity 
        style={styles.touchable} 
        activeOpacity={0.9} 
        onPress={onPress}
      >
        <View style={styles.iconContainer}>
          <Icon 
            name={isDeclined ? "close-circle" : (isCompleted ? "checkmark-circle" : "bicycle")} 
            size={24} 
            color="#fff" 
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.timeText}>{getStatusDisplay()}</Text>
          <Text style={styles.subText}>{isDeclined ? "Tap for info" : "Order Status"}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    zIndex: 1000,
  },
  touchable: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
    minHeight: 80,
  },
  iconContainer: {
    marginBottom: 4,
  },
  textContainer: {
    alignItems: 'center',
  },
  timeText: {
    color: '#fff',
    fontFamily: Fonts.black,
    fontSize: 16,
  },
  subText: {
    color: 'rgba(255,255,255,0.8)',
    fontFamily: Fonts.medium,
    fontSize: 10,
  },
});

export default ActiveOrderWidget;
