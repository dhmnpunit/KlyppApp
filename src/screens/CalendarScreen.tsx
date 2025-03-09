import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Platform 
} from 'react-native';
import { fontStyles, colors } from '../utils/globalStyles';

const THEME = {
  primary: colors.primary,
  text: {
    primary: '#000000',
    secondary: '#444444',
    tertiary: '#888888'
  },
  background: '#F2F3F5',
  card: '#FFFFFF',
  border: '#F0F0F0'
};

export const CalendarScreen = () => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calendar</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.placeholderText}>Calendar view coming soon!</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  header: {
    backgroundColor: THEME.card,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  headerTitle: {
    fontFamily: fontStyles.semiBold,
    fontSize: 28,
    color: THEME.text.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    fontFamily: fontStyles.medium,
    fontSize: 16,
    color: THEME.text.secondary,
  },
}); 