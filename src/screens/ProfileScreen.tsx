import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
  useColorScheme
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../navigation/AppNavigator';
import { useAuthStore, UserProfile } from '../store/authStore';
import { supabase } from '../services/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fontStyles, colors } from '../utils/globalStyles';
import { useSubscriptionStore } from '../store/subscriptionStore';

// Define theme colors consistent with the app
const THEME = {
  primary: colors.primary,
  primaryLight: 'rgba(132, 63, 222, 0.08)', // Lighter purple background
  primaryDark: '#6A32B2', // Darker shade of #843FDE
  text: {
    primary: '#000000',
    secondary: '#444444',
    tertiary: '#888888'
  },
  background: '#F2F3F5', // Slightly darker background
  card: '#FFFFFF',
  border: '#F0F0F0'
};

type ProfileScreenNavigationProp = NativeStackNavigationProp<MainStackParamList, 'Profile'>;

/**
 * Custom hook to manage profile state and actions
 */
const useProfileManagement = () => {
  const { 
    user, 
    profile, 
    fetchProfile, 
    updateProfile, 
    signOut, 
    loading: authLoading, 
    error: authError,
    ensureProfileExists 
  } = useAuthStore();
  
  // Form state
  const [formState, setFormState] = useState({
    name: '',
    username: '',
    currency: 'USD',
    theme: 'light' as 'light' | 'dark' | 'system'
  });
  
  // UI state
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize form state from profile
  useEffect(() => {
    if (profile && !authLoading) {
      setFormState({
        name: profile.name || '',
        username: profile.username || '',
        currency: profile.currency || 'USD',
        theme: profile.theme || 'light'
      });
      setError(null);
    } else if (authError) {
      setError(authError);
    }
  }, [profile, authLoading, authError]);
  
  // Fetch profile data if needed
  useEffect(() => {
    if (!profile && !authLoading) {
      console.log('ProfileScreen: Fetching profile data');
      fetchProfile();
    }
  }, [profile, authLoading, fetchProfile]);
  
  // Handle profile refresh
  const handleRefreshProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await fetchProfile();
      
      if (!profile) {
        await ensureProfileExists();
      }
      
      setLoading(false);
      Alert.alert('Success', 'Profile refreshed successfully');
    } catch (err) {
      console.error('Error refreshing profile:', err);
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Failed to refresh profile');
      Alert.alert('Error', 'Failed to refresh profile');
    }
  }, [fetchProfile, ensureProfileExists, profile]);
  
  // Handle profile save
  const handleSaveProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!formState.username) {
        setError('Username is required');
        setLoading(false);
        Alert.alert('Error', 'Username is required');
        return;
      }
      
      const updatedProfile: Partial<UserProfile> = {
        name: formState.name,
        username: formState.username,
        currency: formState.currency,
        theme: formState.theme,
      };
      
      await updateProfile(updatedProfile);
      
      setIsEditing(false);
      setLoading(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (err) {
      console.error('Error saving profile:', err);
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      Alert.alert('Error', 'Failed to update profile');
    }
  }, [formState, updateProfile]);
  
  // Handle sign out
  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      // Navigation will be handled by the auth state change
    } catch (err) {
      console.error('Error signing out:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign out');
      Alert.alert('Error', 'Failed to sign out');
    }
  }, [signOut]);
  
  return {
    user,
    profile,
    formState,
    setFormState,
    isEditing,
    setIsEditing,
    loading: loading || authLoading,
    error: error || authError,
    handleRefreshProfile,
    handleSaveProfile,
    handleSignOut
  };
};

export const ProfileScreen = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const {
    user,
    profile,
    formState,
    setFormState,
    isEditing,
    setIsEditing,
    loading,
    error,
    handleRefreshProfile,
    handleSaveProfile,
    handleSignOut
  } = useProfileManagement();
  const { subscriptions, fetchSubscriptions } = useSubscriptionStore();
  const systemColorScheme = useColorScheme();

  // Calculate subscription stats and trends
  const subscriptionStats = useMemo(() => {
    const activeSubscriptions = subscriptions || [];
    const sharedSubscriptions = activeSubscriptions.filter(sub => sub.is_shared);
    
    // Calculate total monthly spending
    const totalSpending = activeSubscriptions.reduce((sum, sub) => {
      let monthlyCost = sub.cost;
      
      // Convert all costs to monthly
      switch (sub.renewal_frequency) {
        case 'yearly':
          monthlyCost = sub.cost / 12;
          break;
        case 'quarterly':
          monthlyCost = sub.cost / 3;
          break;
        case 'weekly':
          monthlyCost = sub.cost * 4.33; // Average weeks in a month
          break;
        case 'daily':
          monthlyCost = sub.cost * 30; // Average days in a month
          break;
      }
      
      return sum + monthlyCost;
    }, 0);

    // Calculate previous month's stats
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const previousMonthSubscriptions = activeSubscriptions.filter(sub => {
      const startDate = new Date(sub.start_date);
      return startDate <= oneMonthAgo;
    });
    
    const previousSharedCount = previousMonthSubscriptions.filter(sub => sub.is_shared).length;
    
    // Calculate previous month's spending
    const previousMonthSpending = previousMonthSubscriptions.reduce((sum, sub) => {
      let monthlyCost = sub.cost;
      switch (sub.renewal_frequency) {
        case 'yearly':
          monthlyCost = sub.cost / 12;
          break;
        case 'quarterly':
          monthlyCost = sub.cost / 3;
          break;
        case 'weekly':
          monthlyCost = sub.cost * 4.33;
          break;
        case 'daily':
          monthlyCost = sub.cost * 30;
          break;
      }
      return sum + monthlyCost;
    }, 0);

    // Calculate trends
    const spendingDiff = totalSpending - previousMonthSpending;
    const spendingTrendPercent = previousMonthSpending ? Math.round((spendingDiff / previousMonthSpending) * 100) : 0;
    
    const plansDiff = activeSubscriptions.length - previousMonthSubscriptions.length;
    const sharedDiff = sharedSubscriptions.length - previousSharedCount;

    return {
      totalSpending: Math.round(totalSpending * 100) / 100,
      activeCount: activeSubscriptions.length,
      sharedCount: sharedSubscriptions.length,
      spendingTrend: spendingTrendPercent,
      plansTrend: plansDiff,
      sharedTrend: sharedDiff
    };
  }, [subscriptions]);

  // Fetch subscriptions when component mounts
  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  if (loading && !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
            <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <View style={styles.backButtonCircle}>
          <Ionicons name="arrow-back" size={22} color={THEME.text.primary} />
        </View>
      </TouchableOpacity>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Profile</Text>

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <LinearGradient
            colors={[THEME.primaryDark, THEME.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.profileGradient}
          >
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {profile?.username ? profile.username.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{profile?.name || profile?.username || 'User'}</Text>
                <Text style={styles.profileEmail}>{user?.email}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.card}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                <Ionicons name="cash-outline" size={20} color={THEME.primary} />
              </View>
                <View>
                  <Text style={styles.settingText}>Monthly Spend</Text>
                  <Text style={styles.settingValue}>${subscriptionStats.totalSpending}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                <Ionicons name="apps-outline" size={20} color={THEME.primary} />
              </View>
                <View>
                  <Text style={styles.settingText}>Active Plans</Text>
                  <Text style={styles.settingValue}>{subscriptionStats.activeCount} subscriptions</Text>
                </View>
              </View>
            </View>
            
            <View style={[styles.settingItem, styles.settingItemLast]}>
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                <Ionicons name="people-outline" size={20} color={THEME.primary} />
              </View>
                <View>
                  <Text style={styles.settingText}>Shared Plans</Text>
                  <Text style={styles.settingValue}>{subscriptionStats.sharedCount} subscriptions</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name="person-outline" size={20} color={THEME.primary} />
                </View>
                <Text style={styles.settingText}>Username</Text>
              </View>
              <View style={styles.settingRight}>
                <Text style={styles.settingValue}>{profile?.username || 'Not set'}</Text>
                <Ionicons name="chevron-forward" size={20} color={THEME.text.tertiary} />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name="cash-outline" size={20} color={THEME.primary} />
                </View>
                <Text style={styles.settingText}>Currency</Text>
              </View>
              <View style={styles.settingRight}>
                <View style={styles.currencyBadge}>
                  <Text style={styles.currencyBadgeText}>{profile?.currency || 'USD'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={THEME.text.tertiary} />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.settingItem, styles.settingItemLast]}>
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name="moon-outline" size={20} color={THEME.primary} />
                </View>
                <Text style={styles.settingText}>Dark Mode</Text>
              </View>
              <Switch
                value={profile?.theme === 'dark'}
                onValueChange={() => {}}
                trackColor={{ false: '#E9ECEF', true: 'rgba(132, 63, 222, 0.4)' }}
                thumbColor={profile?.theme === 'dark' ? THEME.primary : '#FFFFFF'}
                ios_backgroundColor="#E9ECEF"
              />
            </TouchableOpacity>
          </View>
            </View>
            
        {/* Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.card}>
            <TouchableOpacity 
              style={[styles.settingItem, styles.settingItemLast]}
              onPress={handleSignOut}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, styles.logoutIcon]}>
                  <Ionicons name="log-out-outline" size={20} color={colors.error} />
                </View>
                <Text style={[styles.settingText, styles.logoutText]}>Sign Out</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
          
          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={() => Alert.alert(
              'Delete Account',
              'Are you sure you want to delete your account? This action cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Delete', 
                  style: 'destructive',
                  onPress: () => Alert.alert('Coming Soon', 'Account deletion will be available in a future update.')
                }
              ]
            )}
          >
          <Text style={styles.deleteAccountText}>Delete Account</Text>
          </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 72 : 44,
    left: 20,
    zIndex: 1,
  },
  backButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 124 : 96,
  },
  screenTitle: {
    fontFamily: fontStyles.semiBold,
    fontSize: 28,
    color: THEME.text.primary,
    marginBottom: 24,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: fontStyles.regular,
    fontSize: 14,
    color: colors.error,
    marginLeft: 8,
    flex: 1,
  },
  profileCard: {
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  profileGradient: {
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontFamily: fontStyles.bold,
    fontSize: 24,
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontFamily: fontStyles.semiBold,
    fontSize: 20,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileEmail: {
    fontFamily: fontStyles.regular,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: fontStyles.semiBold,
    fontSize: 16,
    color: THEME.text.secondary,
    marginBottom: 12,
  },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  settingItemLast: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingText: {
    fontFamily: fontStyles.medium,
    fontSize: 15,
    color: THEME.text.primary,
    marginLeft: 0,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontFamily: fontStyles.regular,
    fontSize: 14,
    color: THEME.text.tertiary,
    marginRight: 8,
  },
  currencyBadge: {
    backgroundColor: THEME.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  currencyBadgeText: {
    fontFamily: fontStyles.medium,
    fontSize: 12,
    color: THEME.primary,
  },
  logoutIcon: {
    backgroundColor: 'transparent',
  },
  logoutText: {
    color: colors.error,
  },
  deleteAccountButton: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 32,
  },
  deleteAccountText: {
    fontFamily: fontStyles.medium,
    fontSize: 14,
    color: THEME.text.tertiary,
    textDecorationLine: 'underline',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.background,
  },
  loadingText: {
    fontFamily: fontStyles.medium,
    marginTop: 12,
    fontSize: 16,
    color: THEME.text.secondary,
  },
}); 