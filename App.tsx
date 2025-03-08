import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import * as Font from 'expo-font';
import { View, Text } from 'react-native';
import { AlertProvider } from './src/context/AlertContext';
import { CustomAlert } from './src/components/CustomAlert';

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Load fonts
  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          // Add custom fonts here if needed
        });
        setFontsLoaded(true);
      } catch (error) {
        console.error('Error loading fonts:', error);
        // Continue without custom fonts
        setFontsLoaded(true);
      }
    }

    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <GluestackUIProvider>
        <AlertProvider>
          <StatusBar style="auto" />
          <AppNavigator />
          <CustomAlert />
        </AlertProvider>
      </GluestackUIProvider>
    </SafeAreaProvider>
  );
}
