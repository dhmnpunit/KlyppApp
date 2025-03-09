import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import * as Font from 'expo-font';
import { View, Text } from 'react-native';
import { AlertProvider } from './src/context/AlertContext';
import { CustomAlert } from './src/components/CustomAlert';
import { 
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold 
} from '@expo-google-fonts/inter';

// Create a theme with Inter font
const theme = {
  fonts: {
    heading: 'Inter_Bold',
    body: 'Inter_Regular',
    mono: 'Inter_Regular',
  },
};

export default function App() {
  // Load Inter fonts
  const [fontsLoaded] = useFonts({
    Inter_Regular: Inter_400Regular,
    Inter_Medium: Inter_500Medium,
    Inter_SemiBold: Inter_600SemiBold,
    Inter_Bold: Inter_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading fonts...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <GluestackUIProvider config={theme}>
        <AlertProvider>
          <StatusBar style="auto" />
          <AppNavigator />
          <CustomAlert />
        </AlertProvider>
      </GluestackUIProvider>
    </SafeAreaProvider>
  );
}
