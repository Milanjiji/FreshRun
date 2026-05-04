import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacityProps 
} from 'react-native';
import { Fonts } from '../theme/typography';

interface PrimaryButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({ 
  title, 
  loading, 
  style, 
  ...props 
}) => {
  return (
    <TouchableOpacity 
      style={[styles.button, style]} 
      disabled={loading || props.disabled} 
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#000',
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  text: {
    color: '#fff',
    fontSize: 18,
    fontFamily: Fonts.black,
    fontWeight: '900',
  },
});
