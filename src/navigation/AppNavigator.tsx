import React, { useState, useEffect, useRef } from 'react';
import { View, Platform, StyleSheet, Pressable, Text, Animated, Easing, LayoutChangeEvent } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { Session } from '@supabase/supabase-js';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from 'react-native';
import { colors, fontStyles } from '../utils/globalStyles';

// Import screens
import { DashboardScreen } from '../screens/DashboardScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SubscriptionDetailsScreen } from '../screens/SubscriptionDetailsScreen';
import { AddSubscriptionScreen } from '../screens/AddSubscriptionScreen';
import { EditSubscriptionScreen } from '../screens/EditSubscriptionScreen';
import { LandingScreen } from '../screens/LandingScreen';
import { SignUpScreen } from '../screens/SignUpScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { SubscriptionsListScreen } from '../screens/SubscriptionsListScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { SharedSubscriptionsScreen } from '../screens/SharedSubscriptionsScreen';

// Main app screens

// Define navigation types
export type AuthStackParamList = {
  Landing: undefined;
  SignUp: undefined;
  Login: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Calendar: undefined;
  Shared: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
  SubscriptionsList: undefined;
  AddSubscription: undefined;
  SubscriptionDetails: { subscriptionId: string };
  EditSubscription: { subscriptionId: string };
  Profile: undefined;
  Settings: undefined;
  Notifications: undefined;
};

// Create navigation stacks
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

// Update the IconName type to include new icon names
type IconName = 
  | 'grid'
  | 'calendar-number'
  | 'people';

const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  // Create a simple implementation with fixed positions
  const translateX = useRef(new Animated.Value(0)).current;
  
  // Update position based on index
  useEffect(() => {
    // Calculate position based on index (0, 1, or 2)
    let position = 0;
    
    // The navbar has 3 tabs with equal width (90px) and 8px padding on each side
    // Total width is 300px, so each tab position is calculated precisely
    if (state.index === 0) {
      position = 8; // Left padding
    } else if (state.index === 1) {
      position = 105; // (300 - 90) / 2
    } else if (state.index === 2) {
      position = 202; // 300 - 90 - 8
    }
    
    Animated.timing(translateX, {
      toValue: position,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [state.index, translateX]);

  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBar}>
        {/* Animated background indicator */}
        <Animated.View 
          style={[
            styles.activeIndicator,
            {
              transform: [{ translateX }]
            }
          ]} 
        />

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          // Get icon name based on route
          let iconName: IconName;
          if (route.name === 'Dashboard') {
            iconName = 'grid';
          } else if (route.name === 'Calendar') {
            iconName = 'calendar-number';
          } else {
            iconName = 'people';
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
            >
              <View style={styles.tabContent}>
                <Ionicons
                  name={iconName}
                  size={22}
                  color={isFocused ? '#843FDE' : '#888888'}
                />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

// Main tab navigator
const MainTabNavigator = () => {
  return (
    <MainTab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          display: 'none', // Hide the default tab bar
        },
      }}
    >
      <MainTab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
      />
      <MainTab.Screen 
        name="Calendar" 
        component={CalendarScreen}
      />
      <MainTab.Screen 
        name="Shared" 
        component={SharedSubscriptionsScreen}
      />
    </MainTab.Navigator>
  );
};

// Auth stack navigator
const AuthStackNavigator = () => {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Landing" component={LandingScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
};

// Main stack navigator
const MainStackNavigator = () => {
  return (
    <MainStack.Navigator>
      <MainStack.Screen 
        name="MainTabs" 
        component={MainTabNavigator} 
        options={{ headerShown: false }}
      />
      <MainStack.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ headerShown: false }}
      />
      <MainStack.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ headerShown: false }}
      />
      <MainStack.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ headerShown: false }}
      />
      <MainStack.Screen 
        name="SubscriptionsList" 
        component={SubscriptionsListScreen} 
        options={{ title: 'Subscriptions List' }}
      />
      <MainStack.Screen 
        name="AddSubscription" 
        component={AddSubscriptionScreen} 
        options={{ title: 'Add Subscription' }}
      />
      <MainStack.Screen 
        name="SubscriptionDetails" 
        component={SubscriptionDetailsScreen} 
        options={{ title: 'Subscription Details' }}
      />
      <MainStack.Screen 
        name="EditSubscription" 
        component={EditSubscriptionScreen} 
        options={{ title: 'Edit Subscription' }}
      />
    </MainStack.Navigator>
  );
};

// Root navigator
export const AppNavigator = () => {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Set up auth state listener
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          setSession(newSession);
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('Error setting up auth listener:', error);
    }
  }, []);

  return (
    <NavigationContainer>
      {session ? <MainStackNavigator /> : <AuthStackNavigator />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 24,
    left: '50%',
    transform: [{ translateX: -150 }], // Half of the width (300/2)
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingVertical: 8,
    paddingHorizontal: 8,
    width: 300,
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 90,
    height: 40,
    borderRadius: 20,
    zIndex: 1,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    width: 90,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(132, 63, 222, 0.1)', // Light purple background
    zIndex: 0,
    left: 0, // We'll use transform for positioning
  },
}); 