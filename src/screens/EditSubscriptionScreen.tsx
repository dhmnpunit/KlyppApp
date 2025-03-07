import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
  Modal
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../navigation/AppNavigator';
import { useSubscriptionStore, Subscription } from '../store/subscriptionStore';

type EditSubscriptionScreenNavigationProp = NativeStackNavigationProp<
  MainStackParamList,
  'EditSubscription'
>;

type EditSubscriptionScreenRouteProp = RouteProp<
  MainStackParamList,
  'EditSubscription'
>;

// Categories for subscriptions
const CATEGORIES = [
  'Entertainment', 
  'Productivity', 
  'Utilities', 
  'Health & Fitness', 
  'Food & Drink',
  'Shopping',
  'Education',
  'Other'
];

// Renewal frequency options
const RENEWAL_FREQUENCIES = [
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'yearly'
];

export const EditSubscriptionScreen = () => {
  const navigation = useNavigation<EditSubscriptionScreenNavigationProp>();
  const route = useRoute<EditSubscriptionScreenRouteProp>();
  const { subscriptionId } = route.params;
  
  const { getSubscriptionById, updateSubscription, loading, error } = useSubscriptionStore();
  
  // Form state
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [category, setCategory] = useState('Entertainment');
  const [renewalFrequency, setRenewalFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState(new Date());
  const [nextRenewalDate, setNextRenewalDate] = useState(new Date());
  const [autoRenews, setAutoRenews] = useState(true);
  const [isShared, setIsShared] = useState(false);
  const [maxMembers, setMaxMembers] = useState('');
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateType, setDateType] = useState<'start' | 'renewal'>('start');
  
  // Date picker state
  const [tempYear, setTempYear] = useState(startDate.getFullYear());
  const [tempMonth, setTempMonth] = useState(startDate.getMonth() + 1); // JavaScript months are 0-indexed
  const [tempDay, setTempDay] = useState(startDate.getDate());

  useEffect(() => {
    // Load subscription data
    const subscription = getSubscriptionById(subscriptionId);
    if (subscription) {
      setName(subscription.name);
      setCost(subscription.cost.toString());
      setCategory(subscription.category);
      setRenewalFrequency(subscription.renewal_frequency);
      setStartDate(new Date(subscription.start_date));
      setNextRenewalDate(new Date(subscription.next_renewal_date));
      setAutoRenews(subscription.auto_renews);
      setIsShared(subscription.is_shared);
      setMaxMembers(subscription.max_members?.toString() || '');
    } else {
      Alert.alert('Error', 'Subscription not found');
      navigation.goBack();
    }
  }, [subscriptionId, getSubscriptionById]);

  // Calculate next renewal date based on start date and renewal frequency
  useEffect(() => {
    const calculateNextRenewalDate = (date: Date, frequency: string) => {
      const nextDate = new Date(date);
      
      switch (frequency) {
        case 'daily':
          nextDate.setDate(nextDate.getDate() + 1);
          break;
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case 'quarterly':
          nextDate.setMonth(nextDate.getMonth() + 3);
          break;
        case 'yearly':
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
        default:
          nextDate.setMonth(nextDate.getMonth() + 1);
      }
      
      return nextDate;
    };
    
    setNextRenewalDate(calculateNextRenewalDate(startDate, renewalFrequency));
  }, [startDate, renewalFrequency]);

  // Format date to string for display and database
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const openDateModal = (type: 'start' | 'renewal') => {
    setDateType(type);
    const date = type === 'start' ? startDate : nextRenewalDate;
    
    // Initialize temp date values with current date
    setTempYear(date.getFullYear());
    setTempMonth(date.getMonth() + 1);
    setTempDay(date.getDate());
    setShowDateModal(true);
  };

  const confirmDate = () => {
    // Validate date
    if (tempYear < 2000 || tempYear > 2100 || tempMonth < 1 || tempMonth > 12 || tempDay < 1 || tempDay > 31) {
      Alert.alert('Invalid Date', 'Please enter a valid date');
      return;
    }

    // Create new date object
    const newDate = new Date(tempYear, tempMonth - 1, tempDay);
    
    if (dateType === 'start') {
      setStartDate(newDate);
    } else {
      setNextRenewalDate(newDate);
    }
    
    setShowDateModal(false);
  };

  const handleUpdateSubscription = async () => {
    // Validate form
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a subscription name');
      return;
    }

    if (!cost.trim() || isNaN(Number(cost))) {
      Alert.alert('Error', 'Please enter a valid cost');
      return;
    }

    try {
      // Create subscription update object
      const updates = {
        name: name.trim(),
        cost: parseFloat(cost),
        category,
        renewal_frequency: renewalFrequency,
        start_date: formatDate(startDate),
        next_renewal_date: formatDate(nextRenewalDate),
        auto_renews: autoRenews,
        is_shared: isShared,
        max_members: isShared && maxMembers ? parseInt(maxMembers, 10) : undefined,
      };

      // Update subscription in database
      await updateSubscription(subscriptionId, updates);
      
      Alert.alert('Success', 'Subscription updated successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating subscription:', error);
      Alert.alert('Error', 'Failed to update subscription. Please try again.');
    }
  };

  const renderCategoryButtons = () => {
    return (
      <View style={styles.categoryContainer}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryButton,
              category === cat && styles.categoryButtonSelected,
            ]}
            onPress={() => setCategory(cat)}
          >
            <Text
              style={[
                styles.categoryButtonText,
                category === cat && styles.categoryButtonTextSelected,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderFrequencyButtons = () => {
    return (
      <View style={styles.frequencyContainer}>
        {RENEWAL_FREQUENCIES.map((freq) => (
          <TouchableOpacity
            key={freq}
            style={[
              styles.frequencyButton,
              renewalFrequency === freq && styles.frequencyButtonSelected,
            ]}
            onPress={() => setRenewalFrequency(freq as any)}
          >
            <Text
              style={[
                styles.frequencyButtonText,
                renewalFrequency === freq && styles.frequencyButtonTextSelected,
              ]}
            >
              {freq.charAt(0).toUpperCase() + freq.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#008CFF" />
        <Text style={styles.loadingText}>Updating subscription...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Edit Subscription</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Subscription Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Netflix, Spotify, etc."
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Cost ({renewalFrequency})</Text>
        <TextInput
          style={styles.input}
          value={cost}
          onChangeText={setCost}
          placeholder="9.99"
          keyboardType="decimal-pad"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Category</Text>
        {renderCategoryButtons()}

        <Text style={styles.label}>Renewal Frequency</Text>
        {renderFrequencyButtons()}

        <Text style={styles.label}>Start Date</Text>
        <TouchableOpacity 
          style={styles.datePickerButton}
          onPress={() => openDateModal('start')}
        >
          <Text style={styles.dateText}>{formatDate(startDate)}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Next Renewal Date</Text>
        <TouchableOpacity 
          style={styles.datePickerButton}
          onPress={() => openDateModal('renewal')}
        >
          <Text style={styles.dateText}>{formatDate(nextRenewalDate)}</Text>
        </TouchableOpacity>
        
        {/* Custom Date Picker Modal */}
        <Modal
          visible={showDateModal}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                Select {dateType === 'start' ? 'Start' : 'Renewal'} Date
              </Text>
              
              <View style={styles.dateInputContainer}>
                <View style={styles.dateInputGroup}>
                  <Text style={styles.dateInputLabel}>Day</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={tempDay.toString()}
                    onChangeText={(text) => setTempDay(parseInt(text) || 0)}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                
                <View style={styles.dateInputGroup}>
                  <Text style={styles.dateInputLabel}>Month</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={tempMonth.toString()}
                    onChangeText={(text) => setTempMonth(parseInt(text) || 0)}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                
                <View style={styles.dateInputGroup}>
                  <Text style={styles.dateInputLabel}>Year</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={tempYear.toString()}
                    onChangeText={(text) => setTempYear(parseInt(text) || 0)}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
              </View>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowDateModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={confirmDate}
                >
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <View style={styles.switchContainer}>
          <Text style={styles.label}>Auto-renews</Text>
          <Switch
            value={autoRenews}
            onValueChange={setAutoRenews}
            trackColor={{ false: '#ccc', true: '#008CFF' }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.switchContainer}>
          <Text style={styles.label}>Shared Subscription</Text>
          <Switch
            value={isShared}
            onValueChange={setIsShared}
            trackColor={{ false: '#ccc', true: '#008CFF' }}
            thumbColor="#fff"
          />
        </View>

        {isShared && (
          <>
            <Text style={styles.label}>Maximum Members</Text>
            <TextInput
              style={styles.input}
              value={maxMembers}
              onChangeText={setMaxMembers}
              placeholder="5"
              keyboardType="number-pad"
              placeholderTextColor="#999"
            />
          </>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.updateButton}
            onPress={handleUpdateSubscription}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.updateButtonText}>Update Subscription</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  formContainer: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  categoryButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    margin: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryButtonSelected: {
    backgroundColor: '#008CFF',
    borderColor: '#008CFF',
  },
  categoryButtonText: {
    color: '#333',
  },
  categoryButtonTextSelected: {
    color: '#fff',
  },
  frequencyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  frequencyButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    margin: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  frequencyButtonSelected: {
    backgroundColor: '#008CFF',
    borderColor: '#008CFF',
  },
  frequencyButtonText: {
    color: '#333',
  },
  frequencyButtonTextSelected: {
    color: '#fff',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonContainer: {
    marginTop: 10,
  },
  updateButton: {
    backgroundColor: '#008CFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  dateInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  dateInputGroup: {
    alignItems: 'center',
    width: '30%',
  },
  dateInputLabel: {
    fontSize: 14,
    marginBottom: 5,
  },
  dateInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
    padding: 10,
    width: '100%',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    borderRadius: 5,
    padding: 10,
    width: '45%',
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#008CFF',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
}); 