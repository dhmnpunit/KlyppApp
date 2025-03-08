import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Modal,
  ScrollView,
  Dimensions,
  Image,
  Platform
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { MainStackParamList, MainTabParamList } from '../navigation/AppNavigator';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { useAuthStore } from '../store/authStore';
import { Subscription } from '../store/subscriptionStore';
import { fontStyles, textStyles, colors } from '../utils/globalStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Define a composite navigation type that can navigate both in tabs and stack
type DashboardScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Dashboard'>,
  NativeStackNavigationProp<MainStackParamList>
>;

// Categories for subscriptions
const CATEGORIES = [
  'All',
  'Entertainment', 
  'Productivity', 
  'Utilities', 
  'Health & Fitness', 
  'Food & Drink',
  'Shopping',
  'Education',
  'Other'
];

// Sort options
const SORT_OPTIONS = [
  { label: 'Name (A-Z)', value: 'name-asc' },
  { label: 'Name (Z-A)', value: 'name-desc' },
  { label: 'Cost (Low to High)', value: 'cost-asc' },
  { label: 'Cost (High to Low)', value: 'cost-desc' },
  { label: 'Next Renewal Date', value: 'renewal-date' },
  { label: 'Recently Added', value: 'recent' }
];

// Define theme colors at the top of the file
const THEME = {
  primary: colors.primary,
  primaryLight: 'rgba(132, 63, 222, 0.15)', // Slightly more opaque for better visibility on Android
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

export const DashboardScreen = () => {
  const navigation = useNavigation<DashboardScreenNavigationProp>();
  const { subscriptions, fetchSubscriptions, loading, error } = useSubscriptionStore();
  const { user, profile, fetchProfile, ensureProfileExists } = useAuthStore();
  const { signOut } = useAuthStore();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<Subscription[]>([]);
  const [totalCost, setTotalCost] = useState<number>(0);
  const [costDifference, setCostDifference] = useState<number>(0);
  const [showSortModal, setShowSortModal] = useState<boolean>(false);
  const [sortOption, setSortOption] = useState<string>('cost-high');
  const [previousMonthCost, setPreviousMonthCost] = useState<number>(0);
  
  // Screen width for the chart
  const screenWidth = Dimensions.get('window').width - 32; // Full width minus padding

  // Colors for the pie chart
  const chartColors = [
    '#2E4053', // Dark blue
    '#3498DB', // Blue
    '#1ABC9C', // Teal
    '#F1C40F', // Yellow
    '#E67E22', // Orange
    '#E74C3C', // Red
    '#9B59B6', // Purple
    '#27AE60', // Green
    '#95A5A6', // Gray
  ];

  // Helper function to calculate total monthly cost
  const calculateTotalCost = (subs: Subscription[]): number => {
    return subs.reduce((sum, sub) => {
      // Convert all costs to monthly for consistency
      let cost = typeof sub.cost === 'string' ? parseFloat(sub.cost) : sub.cost;
      let monthlyCost = cost;
      
      if (sub.renewal_frequency === 'yearly') {
        monthlyCost = cost / 12;
      } else if (sub.renewal_frequency === 'quarterly') {
        monthlyCost = cost / 3;
      } else if (sub.renewal_frequency === 'weekly') {
        monthlyCost = cost * 4.33; // Average weeks in a month
      } else if (sub.renewal_frequency === 'daily') {
        monthlyCost = cost * 30; // Average days in a month
      }
      
      return sum + monthlyCost;
    }, 0);
  };
  
  // Helper function to sort subscriptions
  const sortSubscriptions = (subs: Subscription[], sortBy: string): Subscription[] => {
    return [...subs].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'cost-high':
          return b.cost - a.cost;
        case 'cost-low':
          return a.cost - b.cost;
        case 'renewal-date':
          return new Date(a.next_renewal_date).getTime() - new Date(b.next_renewal_date).getTime();
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });
  };

  // Calculate the cost difference from the previous month
  const calculateCostDifference = (subs: Subscription[]) => {
    // For demo purposes, let's simulate a previous month cost
    // In a real app, you would fetch this from your backend or calculate it based on historical data
    
    // Only recalculate if we haven't done so already or if the total cost has changed
    if (previousMonthCost === 0 || Math.abs(totalCost - previousMonthCost - costDifference) > 0.01) {
      // Generate a random previous month cost that's somewhat realistic
      // This ensures the difference is reasonable (between -20% and +20% of current cost)
      const variationPercentage = (Math.random() * 0.4) - 0.2; // Random value between -0.2 and 0.2
      const simulatedPreviousMonthCost = totalCost / (1 + variationPercentage);
      setPreviousMonthCost(simulatedPreviousMonthCost);
      
      // Calculate the difference (current - previous)
      const difference = totalCost - simulatedPreviousMonthCost;
      setCostDifference(difference);
      
      return difference;
    }
    
    return costDifference;
  };

  // Use useFocusEffect to refresh subscriptions and profile when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('Dashboard screen focused, refreshing data...');
      fetchSubscriptions();
      fetchProfile(); // Fetch the user profile when screen is focused
      return () => {
        // Cleanup function (optional)
      };
    }, [fetchSubscriptions, fetchProfile])
  );

  // Keep the existing useEffect for initial load
  useEffect(() => {
    // Initial fetch when component mounts
    fetchSubscriptions();
    
    // Ensure the user profile exists and is loaded
    ensureProfileExists().then(() => {
      fetchProfile(); // Fetch the profile after ensuring it exists
    });
  }, []);

  useEffect(() => {
    if (subscriptions) {
      let filtered = [...subscriptions];
      
      // Filter by category if not 'All'
      if (selectedCategory !== 'All') {
        filtered = filtered.filter(sub => sub.category === selectedCategory);
      }
      
      // Sort subscriptions
      filtered = sortSubscriptions(filtered, sortOption);
      
      setFilteredSubscriptions(filtered);
      setTotalCost(calculateTotalCost(filtered));
      setCostDifference(calculateCostDifference(filtered));
    }
  }, [subscriptions, selectedCategory, sortOption]);

  const handleAddSubscription = () => {
    navigation.navigate('AddSubscription');
  };

  const handleSubscriptionPress = (subscriptionId: string) => {
    navigation.navigate('SubscriptionDetails', { subscriptionId });
  };

  // Update the getCategoryColor function to use our theme color for the default
  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'Entertainment':
        return '#FF5757'; // Red
      case 'Productivity':
        return '#4A6FFF'; // Blue
      case 'Utilities':
        return '#FF9F45'; // Orange
      case 'Shopping':
        return THEME.primary; // Our theme color
      case 'Health & Fitness':
        return '#50E3C2'; // Teal
      case 'Education':
        return '#FFDE59'; // Yellow
      case 'Food & Drink':
        return '#7A5AF8'; // Purple
      case 'Other':
        return THEME.primary; // Our theme color
      default:
        return THEME.primary; // Our theme color
    }
  };

  // Update the renderSubscriptionItem function
  const renderSubscriptionItem = ({ item }: { item: Subscription }) => {
    // Format the renewal date
    const renewalDate = new Date(item.next_renewal_date);
    const formattedDate = renewalDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    
    // Calculate days until renewal
    const today = new Date();
    const daysUntilRenewal = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isRenewalSoon = daysUntilRenewal <= 3;
    
    // Handle cost properly - item.cost could be a number or string
    const cost = typeof item.cost === 'string' ? parseFloat(item.cost) : item.cost;
    
    return (
      <TouchableOpacity
        key={item.subscription_id}
        style={styles.subscriptionCard}
        onPress={() => navigation.navigate('SubscriptionDetails', { subscriptionId: item.subscription_id })}
      >
        <View style={styles.subscriptionContent}>
          {/* Main content */}
          <View style={styles.subscriptionMainContent}>
            {/* Top row with name and cost */}
            <View style={styles.subscriptionTopRow}>
              <View style={styles.subscriptionNameContainer}>
                <Text style={styles.subscriptionName} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.is_shared && (
                  <View style={styles.sharedBadge}>
                    <Text style={styles.sharedBadgeText}>Shared</Text>
                  </View>
                )}
              </View>
              <Text style={styles.subscriptionCost}>${cost.toFixed(2)}</Text>
            </View>
            
            {/* Bottom row with category and renewal */}
            <View style={styles.subscriptionBottomRow}>
              <Text style={styles.subscriptionCategory}>{item.category}</Text>
              <View style={styles.renewalContainer}>
                <Text style={[
                  styles.renewalText,
                  isRenewalSoon && styles.renewalSoonText
                ]}>
                  {isRenewalSoon ? 'Renews soon' : 'Renews'}: 
                  <Text style={[
                    styles.renewalDate,
                    isRenewalSoon && styles.renewalSoonDate
                  ]}> {formattedDate}</Text>
                  {isRenewalSoon && ` (${daysUntilRenewal} day${daysUntilRenewal !== 1 ? 's' : ''})`}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategoryFilter = () => {
    return (
      <View style={styles.categoryFilterSection}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryFilterScrollContent}
        >
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryPill,
                selectedCategory === category && styles.categoryPillSelected
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  selectedCategory === category && styles.categoryPillTextSelected
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderSortModal = () => (
    <Modal
      visible={showSortModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowSortModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Sort By</Text>
          
          {SORT_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.sortOption,
                sortOption === option.value && styles.sortOptionSelected
              ]}
              onPress={() => {
                setSortOption(option.value);
                setShowSortModal(false);
              }}
            >
              <Text 
                style={[
                  styles.sortOptionText,
                  sortOption === option.value && styles.sortOptionTextSelected
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowSortModal(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading && subscriptions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your subscriptions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with profile and settings */}
      <View style={[styles.header, Platform.OS === 'android' && styles.headerAndroid]}>
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <Text style={styles.profileInitial}>
              {(profile?.name?.charAt(0) || profile?.username?.charAt(0) || 'K').toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.username}>
              {profile?.name || profile?.username || 'User'}
            </Text>
            <View style={styles.walletAddressContainer}>
              <Text style={styles.walletAddress}>
                {(() => {
                  const userId = user?.id;
                  if (!userId) return '';
                  return `${userId.substring(0, 8)}...${userId.substring(userId.length - 4)}`;
                })()}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.settingsButton} 
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.7}
        >
          <View style={styles.settingsIconContainer}>
            <Ionicons 
              name="settings-outline" 
              size={22} 
              color={THEME.primary}
              style={Platform.OS === 'android' ? { marginLeft: 1 } : {}} // Adjust position on Android
            />
          </View>
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Main balance card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Monthly Spending</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceAmount}>${totalCost.toFixed(2)}</Text>
            {costDifference !== 0 && (
              <View style={[
                styles.percentageContainer, 
                costDifference > 0 ? styles.negativePercentage : styles.positivePercentage
              ]}>
                <Text style={[
                  styles.percentageText,
                  costDifference > 0 ? styles.negativePercentageText : styles.positivePercentageText
                ]}>
                  {costDifference > 0 ? '+' : '-'}
                  {Math.abs(costDifference).toFixed(2)}%
                </Text>
              </View>
            )}
          </View>
          
          {/* Quick action buttons */}
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleAddSubscription}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconContainer}>
                <Ionicons 
                  name="add" 
                  size={22} 
                  color={THEME.primary} 
                />
              </View>
              <Text style={styles.actionText}>Add</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setShowSortModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconContainer}>
                <Ionicons 
                  name="filter" 
                  size={20} 
                  color={THEME.primary} 
                />
              </View>
              <Text style={styles.actionText}>Sort</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Notifications')}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconContainer}>
                <Ionicons 
                  name="notifications" 
                  size={20} 
                  color={THEME.primary} 
                />
              </View>
              <Text style={styles.actionText}>Alerts</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {/* Implement analytics functionality */}}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconContainer}>
                <Ionicons 
                  name="stats-chart" 
                  size={20} 
                  color={THEME.primary} 
                />
              </View>
              <Text style={styles.actionText}>Analytics</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Category filter as pills */}
        <View style={styles.categoryFilterSection}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryFilterScrollContent}
          >
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryPill,
                  selectedCategory === category && styles.categoryPillSelected
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    selectedCategory === category && styles.categoryPillTextSelected
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        {/* Subscriptions list */}
        <View style={styles.subscriptionsSection}>
          <Text style={styles.sectionTitle}>
            Active Subscriptions
            <Text style={styles.subscriptionCount}> ({filteredSubscriptions.length})</Text>
            {filteredSubscriptions.filter(sub => sub.is_shared).length > 0 && (
              <Text style={styles.sharedCount}> • {filteredSubscriptions.filter(sub => sub.is_shared).length} shared</Text>
            )}
          </Text>
          
          {filteredSubscriptions.length === 0 ? (
            <View style={styles.emptySubscriptions}>
              <Text style={styles.emptySubscriptionsText}>
                {selectedCategory !== 'All' 
                  ? `No subscriptions in ${selectedCategory} category` 
                  : 'No active subscriptions'}
              </Text>
              <TouchableOpacity 
                style={styles.emptyAddButton}
                onPress={handleAddSubscription}
              >
                <Text style={styles.emptyAddButtonText}>Add Your First Subscription</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.subscriptionsList}>
              {filteredSubscriptions.map(item => (
                <React.Fragment key={item.subscription_id}>
                  {renderSubscriptionItem({ item })}
                </React.Fragment>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      
      {renderSortModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 10,
    paddingBottom: 16,
    height: Platform.OS === 'ios' ? 90 : 105,
    backgroundColor: THEME.background,
    borderBottomWidth: 0,
    borderBottomColor: THEME.border,
    zIndex: 10,
  },
  headerAndroid: {
    paddingTop: 45,
    elevation: 0,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    ...(Platform.OS === 'ios' 
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
        }
      : {
          elevation: 0,
          borderWidth: 0.5,
          borderColor: 'rgba(255,255,255,0.2)',
          overflow: 'hidden',
        }
    )
  },
  profileInitial: {
    fontFamily: fontStyles.bold,
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    ...Platform.OS === 'android' ? { lineHeight: 24 } : {},
  },
  profileInfo: {
    justifyContent: 'center',
    height: 40,
  },
  username: {
    fontFamily: fontStyles.semiBold,
    fontSize: 16,
    color: THEME.text.primary,
    ...Platform.OS === 'android' ? { lineHeight: 20 } : {},
  },
  walletAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletAddress: {
    fontFamily: fontStyles.regular,
    fontSize: 12,
    color: THEME.text.tertiary,
    ...Platform.OS === 'android' ? { lineHeight: 16 } : {},
  },
  settingsButton: {
    padding: 8,
  },
  settingsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(132, 63, 222, 0.08)', // Lighter purple background to match action buttons
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'ios' 
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
        }
      : {
          elevation: 0,
          borderWidth: 0.5,
          borderColor: 'rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }
    )
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  balanceCard: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 20,
    marginTop: 0,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  balanceLabel: {
    fontFamily: fontStyles.medium,
    fontSize: 14,
    color: THEME.text.tertiary,
    marginBottom: 4,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceAmount: {
    fontFamily: fontStyles.bold,
    fontSize: 36,
    color: THEME.text.primary,
    marginRight: 8,
  },
  percentageContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  positivePercentage: {
    backgroundColor: 'rgba(132, 63, 222, 0.1)', // Use our theme color with opacity
  },
  negativePercentage: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)', // Light red
  },
  percentageText: {
    fontFamily: fontStyles.medium,
    fontSize: 14,
  },
  positivePercentageText: {
    color: THEME.primary, // Use our theme color
  },
  negativePercentageText: {
    color: '#E74C3C', // Red
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 16,
    marginHorizontal: -20, // Extend to full width by negating the parent padding
    paddingHorizontal: 20, // Add padding back to content
  },
  actionButton: {
    alignItems: 'center',
    width: 60,
    justifyContent: 'center',
    height: 80,
  },
  actionIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(132, 63, 222, 0.08)', // Lighter purple background
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    // Use platform-specific styling
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 0,
        borderWidth: 0.5,
        borderColor: 'rgba(0,0,0,0.05)',
        overflow: 'hidden',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      }
    })
  },
  actionText: {
    fontFamily: fontStyles.medium,
    fontSize: 12,
    color: THEME.text.tertiary,
    textAlign: 'center',
    marginTop: 2,
  },
  categoryFilterSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: fontStyles.semiBold,
    fontSize: 18,
    color: THEME.text.primary,
    marginBottom: 12,
  },
  categoryFilterScrollContent: {
    paddingBottom: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  categoryPillSelected: {
    backgroundColor: THEME.primary,
    borderWidth: 0,
  },
  categoryPillText: {
    fontFamily: fontStyles.medium,
    fontSize: 14,
    color: '#666666',
  },
  categoryPillTextSelected: {
    color: '#FFFFFF',
  },
  chartSection: {
    marginBottom: 16,
  },
  subscriptionsSection: {
    marginBottom: 16,
  },
  subscriptionCount: {
    fontFamily: fontStyles.regular,
    fontSize: 16,
    color: '#888888',
  },
  sharedCount: {
    fontFamily: fontStyles.regular,
    fontSize: 16,
    color: colors.primary,
  },
  emptySubscriptions: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySubscriptionsText: {
    fontFamily: fontStyles.regular,
    fontSize: 16,
    color: THEME.text.tertiary,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyAddButton: {
    backgroundColor: THEME.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  emptyAddButtonText: {
    fontFamily: fontStyles.medium,
    fontSize: 14,
    color: '#FFFFFF',
  },
  subscriptionsList: {
    marginTop: 8,
  },
  subscriptionCard: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  subscriptionContent: {
    flexDirection: 'row',
  },
  subscriptionMainContent: {
    flex: 1,
    padding: 16,
  },
  subscriptionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subscriptionNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  subscriptionName: {
    fontFamily: fontStyles.semiBold,
    fontSize: 17,
    color: THEME.text.primary,
    marginRight: 8,
    flexShrink: 1,
  },
  sharedBadge: {
    backgroundColor: THEME.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  sharedBadgeText: {
    fontFamily: fontStyles.medium,
    fontSize: 12,
    color: THEME.primary,
  },
  subscriptionCost: {
    fontFamily: fontStyles.bold,
    fontSize: 17,
    color: THEME.text.primary,
  },
  subscriptionBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subscriptionCategory: {
    fontFamily: fontStyles.medium,
    fontSize: 14,
    color: THEME.text.tertiary,
  },
  renewalContainer: {
    alignItems: 'flex-end',
  },
  renewalText: {
    fontFamily: fontStyles.regular,
    fontSize: 12,
    color: '#888888',
  },
  renewalDate: {
    fontFamily: fontStyles.medium,
    fontSize: 12,
    color: '#888888',
  },
  renewalSoonText: {
    color: '#E74C3C',
  },
  renewalSoonDate: {
    color: '#E74C3C',
    fontFamily: fontStyles.semiBold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  sortOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sortOptionSelected: {
    backgroundColor: '#f0f8ff',
  },
  sortOptionText: {
    fontSize: 16,
    color: '#333',
  },
  sortOptionTextSelected: {
    color: colors.primary,
    fontWeight: '500',
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  categoryFilterWrapper: {
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 0,
  },
  categoryFilterContainer: {
    paddingVertical: 0,
    marginBottom: 0,
  },
  categoryFilterScrollView: {
    maxHeight: 32,
    marginVertical: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
}); 