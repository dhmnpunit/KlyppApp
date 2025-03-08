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
  Dimensions
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../navigation/AppNavigator';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { useAuthStore } from '../store/authStore';
import { Subscription } from '../store/subscriptionStore';
import { DonutChart } from '../components/DonutChart';

type DashboardScreenNavigationProp = NativeStackNavigationProp<MainStackParamList>;

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

export const DashboardScreen = () => {
  const navigation = useNavigation<DashboardScreenNavigationProp>();
  const { subscriptions, fetchSubscriptions, loading, error } = useSubscriptionStore();
  const { signOut } = useAuthStore();
  const [totalCost, setTotalCost] = useState(0);
  const [previousMonthCost, setPreviousMonthCost] = useState(0);
  const [costDifference, setCostDifference] = useState(0);
  
  // Filtering and sorting state
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortOption, setSortOption] = useState('name-asc');
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<Subscription[]>([]);
  const [showSortModal, setShowSortModal] = useState(false);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  
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

  // Calculate spending by category
  const calculateCategorySpending = (subs: Subscription[]) => {
    const categories: { [key: string]: number } = {};
    
    subs.forEach(sub => {
      const category = sub.category || 'Other';
      
      // Convert all costs to monthly for consistency
      let monthlyCost = sub.cost;
      if (sub.renewal_frequency === 'yearly') {
        monthlyCost = sub.cost / 12;
      } else if (sub.renewal_frequency === 'quarterly') {
        monthlyCost = sub.cost / 3;
      } else if (sub.renewal_frequency === 'weekly') {
        monthlyCost = sub.cost * 4.33; // Average weeks in a month
      } else if (sub.renewal_frequency === 'daily') {
        monthlyCost = sub.cost * 30; // Average days in a month
      }
      
      if (categories[category]) {
        categories[category] += monthlyCost;
      } else {
        categories[category] = monthlyCost;
      }
    });
    
    // Convert to chart data format
    const data = Object.keys(categories).map((category, index) => {
      return {
        name: category,
        cost: parseFloat(categories[category].toFixed(2)),
        color: chartColors[index % chartColors.length],
        legendFontColor: '#333',
        legendFontSize: 12
      };
    });
    
    // Sort by cost (highest first)
    return data.sort((a, b) => b.cost - a.cost);
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

  // Use useFocusEffect to refresh subscriptions when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('Dashboard screen focused, refreshing subscriptions...');
      fetchSubscriptions();
      return () => {
        // Cleanup function (optional)
      };
    }, [fetchSubscriptions])
  );

  // Keep the existing useEffect for initial load (optional)
  useEffect(() => {
    // Initial fetch when component mounts
    fetchSubscriptions();
  }, []);

  useEffect(() => {
    // Filter and sort subscriptions whenever subscriptions, category, or sort option changes
    if (subscriptions.length > 0) {
      // First, filter by category
      let filtered = subscriptions;
      if (selectedCategory !== 'All') {
        filtered = subscriptions.filter(sub => sub.category === selectedCategory);
      }
      
      // Then, sort according to the selected option
      const sorted = [...filtered].sort((a, b) => {
        switch (sortOption) {
          case 'name-asc':
            return a.name.localeCompare(b.name);
          case 'name-desc':
            return b.name.localeCompare(a.name);
          case 'cost-asc':
            return a.cost - b.cost;
          case 'cost-desc':
            return b.cost - a.cost;
          case 'renewal-date':
            return new Date(a.next_renewal_date).getTime() - new Date(b.next_renewal_date).getTime();
          case 'recent':
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          default:
            return 0;
        }
      });
      
      setFilteredSubscriptions(sorted);
      
      // Calculate total monthly cost for filtered subscriptions
      const total = filtered.reduce((sum, sub) => {
        // Convert all costs to monthly for consistency
        let monthlyCost = sub.cost;
        if (sub.renewal_frequency === 'yearly') {
          monthlyCost = sub.cost / 12;
        } else if (sub.renewal_frequency === 'quarterly') {
          monthlyCost = sub.cost / 3;
        } else if (sub.renewal_frequency === 'weekly') {
          monthlyCost = sub.cost * 4.33; // Average weeks in a month
        } else if (sub.renewal_frequency === 'daily') {
          monthlyCost = sub.cost * 30; // Average days in a month
        }
        return sum + monthlyCost;
      }, 0);
      
      setTotalCost(total);
      
      // Calculate category spending data for the pie chart
      const categorySpendingData = calculateCategorySpending(subscriptions);
      setCategoryData(categorySpendingData);
      
      // Calculate cost difference from previous month
      calculateCostDifference(subscriptions);
    } else {
      setFilteredSubscriptions([]);
      setTotalCost(0);
      setCategoryData([]);
      setPreviousMonthCost(0);
      setCostDifference(0);
    }
  }, [subscriptions, selectedCategory, sortOption]);

  const handleAddSubscription = () => {
    navigation.navigate('AddSubscription');
  };

  const handleSubscriptionPress = (subscriptionId: string) => {
    navigation.navigate('SubscriptionDetails', { subscriptionId });
  };

  const renderSubscriptionItem = ({ item }: { item: Subscription }) => (
    <TouchableOpacity 
      key={item.subscription_id}
      style={styles.subscriptionCard}
      onPress={() => handleSubscriptionPress(item.subscription_id)}
    >
      <View style={styles.subscriptionHeader}>
        <Text style={styles.subscriptionName}>{item.name}</Text>
        <Text style={styles.subscriptionCost}>
          ${item.cost.toFixed(2)}/{item.renewal_frequency}
        </Text>
      </View>
      
      <View style={styles.subscriptionDetails}>
        <Text style={styles.subscriptionCategory}>{item.category}</Text>
        <Text style={styles.subscriptionRenewal}>
          Next renewal: {new Date(item.next_renewal_date).toLocaleDateString()}
        </Text>
      </View>
      
      {item.is_shared && (
        <View style={styles.subscriptionSharedBadge}>
          <Text style={styles.sharedText}>Shared</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderCategoryFilter = () => (
    <View style={styles.categoryFilterWrapper}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryFilterContainer}
        style={styles.categoryFilterScrollView}
      >
        {CATEGORIES.map(category => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryFilterButton,
              selectedCategory === category && styles.categoryFilterButtonSelected
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text 
              style={[
                styles.categoryFilterText,
                selectedCategory === category && styles.categoryFilterTextSelected
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

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
        <ActivityIndicator size="large" color="#008CFF" />
        <Text style={styles.loadingText}>Loading your subscriptions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Subscriptions</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.sortButton}
            onPress={() => setShowSortModal(true)}
          >
            <Text style={styles.sortButtonText}>Sort</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => signOut()}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Monthly Cost</Text>
            <View style={styles.amountRow}>
              <Text style={styles.summaryAmount}>${totalCost.toFixed(2)}</Text>
            </View>
            {costDifference !== 0 && (
              <Text style={styles.costTrend}>
                {costDifference > 0 ? (
                  <Text style={styles.costIncrease}>+${Math.abs(costDifference).toFixed(2)} from last month</Text>
                ) : (
                  <Text style={styles.costDecrease}>-${Math.abs(costDifference).toFixed(2)} from last month</Text>
                )}
              </Text>
            )}
          </View>
          
          <View style={styles.activeSubscriptionsCard}>
            <Text style={styles.activeSubscriptionsTitle}>Active Subscriptions</Text>
            <View style={styles.amountRow}>
              <Text style={styles.activeSubscriptionsCount}>{filteredSubscriptions.length}</Text>
            </View>
            <View style={styles.sharedBadgeContainer}>
              <Text style={styles.sharedBadgeText}>
                {filteredSubscriptions.filter(sub => sub.is_shared).length} shared
              </Text>
            </View>
          </View>
        </View>
        
        {/* Spending by Category Chart */}
        {categoryData.length > 0 && (
          <DonutChart data={categoryData} />
        )}
        
        {renderCategoryFilter()}
        
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            {error.includes('Database tables not set up') && (
              <View style={styles.setupGuideContainer}>
                <Text style={styles.setupGuideTitle}>Database Setup Guide:</Text>
                <Text style={styles.setupGuideText}>
                  1. Go to your Supabase project dashboard
                </Text>
                <Text style={styles.setupGuideText}>
                  2. Navigate to the SQL Editor
                </Text>
                <Text style={styles.setupGuideText}>
                  3. Run the following SQL to create required tables:
                </Text>
                <View style={styles.codeBlock}>
                  <Text style={styles.codeText}>
                    {`-- Create users table\nCREATE TABLE public.users (\n  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,\n  username TEXT UNIQUE,\n  name TEXT,\n  currency TEXT DEFAULT 'USD',\n  theme TEXT DEFAULT 'light',\n  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP\n);\n\n-- Create subscriptions table\nCREATE TABLE public.subscriptions (\n  subscription_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),\n  admin_id UUID REFERENCES auth.users(id),\n  name TEXT NOT NULL,\n  cost DECIMAL NOT NULL,\n  renewal_frequency TEXT NOT NULL,\n  start_date DATE NOT NULL,\n  next_renewal_date DATE NOT NULL,\n  category TEXT,\n  auto_renews BOOLEAN DEFAULT TRUE,\n  is_shared BOOLEAN DEFAULT FALSE,\n  max_members INTEGER,\n  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,\n  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP\n);\n\n-- Create subscription_members table\nCREATE TABLE public.subscription_members (\n  subscription_id UUID REFERENCES public.subscriptions(subscription_id),\n  user_id UUID REFERENCES auth.users(id),\n  status TEXT DEFAULT 'pending',\n  joined_at TIMESTAMP WITH TIME ZONE,\n  PRIMARY KEY (subscription_id, user_id)\n);\n\n-- Create notifications table\nCREATE TABLE public.notifications (\n  notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),\n  user_id UUID REFERENCES auth.users(id),\n  subscription_id UUID REFERENCES public.subscriptions(subscription_id),\n  message TEXT NOT NULL,\n  type TEXT NOT NULL,\n  status TEXT DEFAULT 'unread',\n  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP\n);`}
                  </Text>
                </View>
                <Text style={styles.setupGuideText}>
                  4. Set up Row Level Security (RLS) policies for each table
                </Text>
                <Text style={styles.setupGuideText}>
                  5. Restart the app after setup is complete
                </Text>
              </View>
            )}
          </View>
        )}
        
        {/* Replace FlatList with a regular View containing subscription items */}
        <View style={styles.subscriptionsList}>
          {filteredSubscriptions.length > 0 ? (
            filteredSubscriptions.map(item => renderSubscriptionItem({ item }))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {selectedCategory !== 'All' 
                  ? `You don't have any subscriptions in the ${selectedCategory} category.` 
                  : "You don't have any subscriptions yet."}
              </Text>
              <Text style={styles.emptySubtext}>
                {selectedCategory !== 'All' 
                  ? 'Try selecting a different category or add a new subscription.' 
                  : 'Add your first subscription to get started!'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
      
      {renderSortModal()}
      
      <TouchableOpacity 
        style={styles.addButton}
        onPress={handleAddSubscription}
      >
        <Text style={styles.addButtonText}>+ Add Subscription</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 44, // For status bar
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortButton: {
    marginRight: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
  },
  sortButtonText: {
    color: '#333',
    fontSize: 14,
  },
  signOutText: {
    color: '#008CFF',
    fontSize: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flex: 1,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  summaryTitle: {
    color: '#666',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 6,
  },
  amountRow: {
    marginBottom: 4,
  },
  summaryAmount: {
    color: '#000',
    fontSize: 26,
    fontWeight: 'bold',
  },
  costTrend: {
    fontSize: 13,
  },
  costIncrease: {
    color: '#E74C3C',
    fontWeight: '500',
  },
  costDecrease: {
    color: '#2ECC71',
    fontWeight: '500',
  },
  activeSubscriptionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flex: 1,
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  activeSubscriptionsTitle: {
    color: '#666',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 6,
  },
  activeSubscriptionsCount: {
    color: '#000',
    fontSize: 26,
    fontWeight: 'bold',
  },
  sharedBadgeContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  sharedBadgeText: {
    color: '#666',
    fontSize: 13,
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
  categoryFilterButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginVertical: 2,
  },
  categoryFilterButtonSelected: {
    backgroundColor: '#008CFF',
  },
  categoryFilterText: {
    color: '#333',
    fontSize: 13,
  },
  categoryFilterTextSelected: {
    color: '#fff',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 16,
    paddingBottom: 100, // Extra space at the bottom for the add button
  },
  subscriptionsList: {
    marginTop: 8,
  },
  subscriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subscriptionName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  subscriptionCost: {
    fontSize: 16,
    fontWeight: '600',
    color: '#008CFF',
  },
  subscriptionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subscriptionCategory: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  subscriptionRenewal: {
    fontSize: 14,
    color: '#666',
  },
  subscriptionSharedBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sharedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#008CFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    marginBottom: 8,
  },
  setupGuideContainer: {
    marginTop: 16,
  },
  setupGuideTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  setupGuideText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  codeBlock: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  codeText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
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
    color: '#008CFF',
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
  categoryFilterScrollView: {
    maxHeight: 32,
    marginVertical: 0,
  },
}); 