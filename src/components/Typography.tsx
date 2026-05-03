import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';

export const PageTitle: React.FC<TextProps> = ({ style, children, ...props }) => {
  return (
    <Text style={[styles.pageTitle, style]} {...props}>
      {children}
    </Text>
  );
};

export const PageSubtitle: React.FC<TextProps> = ({ style, children, ...props }) => {
  return (
    <Text style={[styles.pageSubtitle, style]} {...props}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  pageTitle: {
    fontSize: 32,
    fontFamily: 'Montserrat-Black',
    fontWeight: '900',
    color: '#000',
    marginBottom: 10,
  },
  pageSubtitle: {
    fontSize: 16,
    fontFamily: 'Montserrat-Black',
    fontWeight: '600',
    color: '#666',
    lineHeight: 24,
  },
});
