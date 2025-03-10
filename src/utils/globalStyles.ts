import { StyleSheet } from 'react-native';

// Global font styles to be used throughout the app
export const fontStyles = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

// Global text styles with consistent typography
export const textStyles = StyleSheet.create({
  // Headings
  h1: {
    fontFamily: fontStyles.bold,
    fontSize: 32,
    color: '#000000',
  },
  h2: {
    fontFamily: fontStyles.bold,
    fontSize: 24,
    color: '#000000',
  },
  h3: {
    fontFamily: fontStyles.semiBold,
    fontSize: 20,
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
    fontSize: 16,
    color: '#000000',
  },
  bodySmall: {
    fontFamily: fontStyles.regular,
    fontSize: 12,
    lineHeight: 18,
    color: '#333333',
  },
  bodyBold: {
    fontFamily: fontStyles.semiBold,
    fontSize: 16,
    color: '#000000',
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
    color: '#FFFFFF',
  },
  caption: {
    fontFamily: fontStyles.regular,
    fontSize: 14,
    color: '#888888',
  },
});

// Global color palette
export const colors = {
  primary: '#4D7FFF',
  primaryLight: 'rgba(77, 127, 255, 0.15)',
  primaryDark: '#3D66CC',
  secondary: '#4CAF50',
  background: '#F2F3F5',
  card: '#FFFFFF',
  text: {
    primary: '#000000',
    secondary: '#444444',
    tertiary: '#888888',
    light: '#999999',
  },
  border: '#F0F0F0',
  success: '#34D399',
  error: '#EF4444',
  warning: '#FBBF24',
  info: '#4D7FFF',
};

// Export a default object with all styles
export default {
  fontStyles,
  textStyles,
  colors,
}; 