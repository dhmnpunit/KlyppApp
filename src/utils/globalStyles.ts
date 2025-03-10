import { StyleSheet } from 'react-native';

// Global font styles to be used throughout the app
export const fontStyles = {
  regular: 'Inter_Regular',
  medium: 'Inter_Medium',
  semiBold: 'Inter_SemiBold',
  bold: 'Inter_Bold',
};

// Global text styles with consistent typography
export const textStyles = StyleSheet.create({
  // Headings
  h1: {
    fontFamily: fontStyles.bold,
    fontSize: 28,
    lineHeight: 34,
    color: '#000000',
  },
  h2: {
    fontFamily: fontStyles.bold,
    fontSize: 24,
    lineHeight: 30,
    color: '#000000',
  },
  h3: {
    fontFamily: fontStyles.semiBold,
    fontSize: 20,
    lineHeight: 26,
    color: '#000000',
  },
  h4: {
    fontFamily: fontStyles.semiBold,
    fontSize: 18,
    lineHeight: 24,
    color: '#000000',
  },
  
  // Body text
  bodyLarge: {
    fontFamily: fontStyles.regular,
    fontSize: 16,
    lineHeight: 22,
    color: '#333333',
  },
  body: {
    fontFamily: fontStyles.regular,
    fontSize: 14,
    lineHeight: 20,
    color: '#333333',
  },
  bodySmall: {
    fontFamily: fontStyles.regular,
    fontSize: 12,
    lineHeight: 18,
    color: '#333333',
  },
  
  // Special text styles
  label: {
    fontFamily: fontStyles.medium,
    fontSize: 14,
    lineHeight: 20,
    color: '#666666',
  },
  button: {
    fontFamily: fontStyles.semiBold,
    fontSize: 16,
    lineHeight: 22,
    color: '#FFFFFF',
  },
  caption: {
    fontFamily: fontStyles.regular,
    fontSize: 12,
    lineHeight: 16,
    color: '#666666',
  },
});

// Global color palette
export const colors = {
  primary: '#843FDE',
  primaryLight: 'rgba(132, 63, 222, 0.15)',
  primaryDark: '#6A32B2',
  secondary: '#4CAF50',
  background: '#F8F9FA',
  card: '#FFFFFF',
  text: {
    primary: '#000000',
    secondary: '#333333',
    tertiary: '#666666',
    light: '#999999',
  },
  border: '#E9ECEF',
  success: '#2ECC71',
  error: '#E74C3C',
  warning: '#F1C40F',
  info: '#3498DB',
};

// Export a default object with all styles
export default {
  fontStyles,
  textStyles,
  colors,
}; 