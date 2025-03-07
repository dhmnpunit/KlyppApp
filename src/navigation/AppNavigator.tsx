import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { Session } from '@supabase/supabase-js';

// Import screens
import { LandingScreen } from '../screens/LandingScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { SignUpScreen } from '../screens/SignUpScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { AddSubscriptionScreen } from '../screens/AddSubscriptionScreen';
import { SubscriptionDetailsScreen } from '../screens/SubscriptionDetailsScreen';
import { EditSubscriptionScreen } from '../screens/EditSubscriptionScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';

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
  Profile: undefined;
  Notifications: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
  AddSubscription: undefined;
  SubscriptionDetails: { subscriptionId: string };
  EditSubscription: { subscriptionId: string };
};

// Create navigation stacks
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

// Main tab navigator
const MainTabNavigator = () => {
  return (
    <MainTab.Navigator>
      <MainTab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ headerShown: false }}
      />
      <MainTab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ headerShown: false }}
      />
      <MainTab.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ headerShown: false }}
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