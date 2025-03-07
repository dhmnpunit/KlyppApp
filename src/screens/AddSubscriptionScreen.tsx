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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../navigation/AppNavigator';
import { useSubscriptionStore } from '../store/subscriptionStore';

type AddSubscriptionScreenNavigationProp = NativeStackNavigationProp<MainStackParamList, 'AddSubscription'>;

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

export const AddSubscriptionScreen = () => {
  const navigation = useNavigation<AddSubscriptionScreenNavigationProp>();
  const { addSubscription, loading } = useSubscriptionStore();
  
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
  
  // Date picker state
  const [tempYear, setTempYear] = useState(startDate.getFullYear());
  const [tempMonth, setTempMonth] = useState(startDate.getMonth() + 1); // JavaScript months are 0-indexed
  const [tempDay, setTempDay] = useState(startDate.getDate());

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

  const openDateModal = () => {
    // Initialize temp date values with current startDate
    setTempYear(startDate.getFullYear());
    setTempMonth(startDate.getMonth() + 1);
    setTempDay(startDate.getDate());
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
    setStartDate(newDate);
    setShowDateModal(false);
  };

  const handleAddSubscription = async () => {
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
      // Create subscription object
      const newSubscription = {
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

      // Add subscription to database
      const result = await addSubscription(newSubscription);
      
      if (result) {
        Alert.alert('Success', 'Subscription added successfully');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error adding subscription:', error);
      
      // Check if the error is related to missing database tables
      if (error && typeof error === 'object' && 'message' in error && 
          typeof error.message === 'string' && error.message.includes('does not exist')) {
        Alert.alert(
          'Database Setup Required',
          'The database tables have not been set up yet. Please go to your Supabase dashboard and set up the required tables.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to add subscription. Please try again.');
      }
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Add Subscription</Text>
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
          onPress={openDateModal}
        >
          <Text style={styles.dateText}>{formatDate(startDate)}</Text>
        </TouchableOpacity>
        
        {/* Custom Date Picker Modal */}
        <Modal
          visible={showDateModal}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Start Date</Text>
              
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

        <Text style={styles.label}>Next Renewal Date (Auto-calculated)</Text>
        <View style={styles.disabledInput}>
          <Text style={styles.dateText}>{formatDate(nextRenewalDate)}</Text>
        </View>

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

        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddSubscription}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.addButtonText}>Add Subscription</Text>
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
  addButton: {
    backgroundColor: '#008CFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  addButtonText: {
    color: '#fff',
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
  disabledInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
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
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  confirmButton: {
    backgroundColor: '#008CFF',
  },
  cancelButtonText: {
    color: '#333',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
}); 