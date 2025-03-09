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
  Modal,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../navigation/AppNavigator';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { Ionicons } from '@expo/vector-icons';
import { fontStyles, colors } from '../utils/globalStyles';

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

// Category icons mapping
const CATEGORY_ICONS: {[key: string]: any} = {
  'Entertainment': 'film-outline',
  'Productivity': 'briefcase-outline',
  'Utilities': 'flash-outline',
  'Health & Fitness': 'fitness-outline',
  'Food & Drink': 'restaurant-outline',
  'Shopping': 'cart-outline',
  'Education': 'school-outline',
  'Other': 'apps-outline'
};

// Renewal frequency options
const RENEWAL_FREQUENCIES = [
  'monthly',
  'quarterly',
  'yearly'
] as const;

type RenewalFrequency = typeof RENEWAL_FREQUENCIES[number];

export const AddSubscriptionScreen = () => {
  const navigation = useNavigation<AddSubscriptionScreenNavigationProp>();
  const { addSubscription, loading } = useSubscriptionStore();
  
  // Form state
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [category, setCategory] = useState('Entertainment');
  const [renewalFrequency, setRenewalFrequency] = useState<RenewalFrequency>('monthly');
  const [startDate, setStartDate] = useState(new Date());
  const [nextRenewalDate, setNextRenewalDate] = useState(new Date());
  const [autoRenews, setAutoRenews] = useState(true);
  const [isShared, setIsShared] = useState(false);
  const [maxMembers, setMaxMembers] = useState('');
  
  // Date picker modal state
  const [showDateModal, setShowDateModal] = useState(false);
  const [tempDay, setTempDay] = useState(startDate.getDate());
  const [tempMonth, setTempMonth] = useState(startDate.getMonth() + 1);
  const [tempYear, setTempYear] = useState(startDate.getFullYear());

  // Calculate next renewal date based on start date and renewal frequency
  const calculateNextRenewalDate = (date: Date, frequency: RenewalFrequency) => {
    const nextDate = new Date(date);
    
    switch (frequency) {
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }
    
    return nextDate;
  };

  // Update next renewal date when start date or frequency changes
  useEffect(() => {
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
    // Calculate grid dimensions
    const screenWidth = Dimensions.get('window').width;
    const padding = 40; // Total horizontal padding (20 on each side)
    const numColumns = 2;
    const itemWidth = (screenWidth - padding) / numColumns;
    
    // Group categories into rows of 2
    const rows = [];
    for (let i = 0; i < CATEGORIES.length; i += numColumns) {
      rows.push(CATEGORIES.slice(i, i + numColumns));
    }
    
    return (
      <View style={styles.categoryTableContainer}>
        {rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.categoryRow}>
            {row.map((cat, colIndex) => {
              const isSelected = category === cat;
              const isFirstRow = rowIndex === 0;
              const isLastRow = rowIndex === rows.length - 1;
              const isFirstColumn = colIndex === 0;
              const isLastColumn = colIndex === row.length - 1;
              
              // Determine which corners should be rounded
              const borderTopLeftRadius = isFirstRow && isFirstColumn ? 10 : 0;
              const borderTopRightRadius = isFirstRow && isLastColumn ? 10 : 0;
              const borderBottomLeftRadius = isLastRow && isFirstColumn ? 10 : 0;
              const borderBottomRightRadius = isLastRow && isLastColumn ? 10 : 0;
              
              // Determine border styles
              let borderTopWidth = isFirstRow ? 1 : 0;
              let borderLeftWidth = isFirstColumn ? 1 : 0;
              let borderRightWidth = 1; // Always show right border
              let borderBottomWidth = 1; // Always show bottom border
              
              // If selected, ensure all borders are visible and colored
              let borderStyle = {};
              if (isSelected) {
                borderStyle = {
                  borderTopWidth: 1,
                  borderLeftWidth: 1,
                  borderRightWidth: 1,
                  borderBottomWidth: 1,
                  borderColor: '#843FDE', // Ensure all borders have the purple color
                };
              }
              
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryTableItem,
                    {
                      width: itemWidth,
                      borderTopLeftRadius,
                      borderTopRightRadius,
                      borderBottomLeftRadius,
                      borderBottomRightRadius,
                      borderTopWidth,
                      borderLeftWidth,
                      borderRightWidth,
                      borderBottomWidth,
                    },
                    isSelected && styles.categoryGridItemSelected,
                    isSelected && borderStyle, // Apply the border style for selected items
                  ]}
                  onPress={() => setCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={CATEGORY_ICONS[cat]} 
                    size={20} 
                    color={isSelected ? '#843FDE' : THEME.text.secondary} 
                    style={styles.categoryIcon}
                  />
                  <Text
                    style={[
                      styles.categoryButtonText,
                      isSelected && styles.categoryButtonTextSelected
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  const renderFrequencyButtons = () => {
    const screenWidth = Dimensions.get('window').width;
    const padding = 40; // Total horizontal padding (20 on each side)
    const numOptions = RENEWAL_FREQUENCIES.length;
    const itemWidth = (screenWidth - padding) / numOptions;
    
    return (
      <View style={styles.frequencyTableContainer}>
        {RENEWAL_FREQUENCIES.map((freq, index) => {
          const isSelected = renewalFrequency === freq;
          const isFirst = index === 0;
          const isLast = index === RENEWAL_FREQUENCIES.length - 1;
          
          // Determine which corners should be rounded
          const borderTopLeftRadius = isFirst ? 10 : 0; // Match category radius
          const borderBottomLeftRadius = isFirst ? 10 : 0; // Match category radius
          const borderTopRightRadius = isLast ? 10 : 0; // Match category radius
          const borderBottomRightRadius = isLast ? 10 : 0; // Match category radius
          
          // Determine border styles
          let borderTopWidth = 1;
          let borderLeftWidth = isFirst ? 1 : 0;
          let borderRightWidth = 1;
          let borderBottomWidth = 1;
          
          // If selected, ensure all borders are visible and colored
          let borderStyle = {};
          if (isSelected) {
            borderStyle = {
              borderTopWidth: 1,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderBottomWidth: 1,
              borderColor: '#843FDE', // Ensure all borders have the purple color
            };
          }
          
          return (
            <TouchableOpacity
              key={freq}
              style={[
                styles.frequencyTableItem,
                {
                  width: itemWidth,
                  borderTopLeftRadius,
                  borderTopRightRadius,
                  borderBottomLeftRadius,
                  borderBottomRightRadius,
                  borderTopWidth,
                  borderLeftWidth,
                  borderRightWidth,
                  borderBottomWidth,
                },
                isSelected && styles.categoryGridItemSelected, // Use the same selected style as categories
                isSelected && borderStyle, // Apply the border style for selected items
              ]}
              onPress={() => {
                setRenewalFrequency(freq);
                setNextRenewalDate(calculateNextRenewalDate(startDate, freq));
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.frequencyButtonText,
                  isSelected && styles.categoryButtonTextSelected // Use the same selected text style as categories
                ]}
              >
                {freq.charAt(0).toUpperCase() + freq.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Section: Basic Information */}
          <View style={styles.section}>
            {/* Subscription Name */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Subscription Name</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="bookmark-outline" size={20} color={THEME.text.tertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Netflix, Spotify, etc."
                  placeholderTextColor={THEME.text.tertiary}
                />
              </View>
            </View>

            {/* Cost */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Cost ({renewalFrequency})</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="cash-outline" size={20} color={THEME.text.tertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={cost}
                  onChangeText={setCost}
                  placeholder="9.99"
                  keyboardType="decimal-pad"
                  placeholderTextColor={THEME.text.tertiary}
                />
              </View>
            </View>

            {/* Category */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Category</Text>
              {renderCategoryButtons()}
            </View>
          </View>

          {/* Section: Billing Details - No top border */}
          <View style={styles.sectionNoBorder}>
            {/* Renewal Frequency */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Renewal Frequency</Text>
              {renderFrequencyButtons()}
            </View>

            {/* Start Date */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Start Date</Text>
              <TouchableOpacity 
                style={styles.datePickerButton}
                onPress={openDateModal}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={20} color={THEME.text.tertiary} style={styles.inputIcon} />
                <Text style={styles.dateText}>{formatDate(startDate)}</Text>
              </TouchableOpacity>
              <View style={styles.renewalDateContainer}>
                <Text style={styles.renewalDateLabel}>Next Renewal: </Text>
                <Text style={styles.renewalDateText}>{formatDate(nextRenewalDate)}</Text>
              </View>
            </View>
          </View>

          {/* Section: Subscription Settings - No borders */}
          <View style={styles.sectionNoBorder}>
            {/* Toggle Switches Container */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Subscription Settings</Text>
              <View style={styles.togglesContainer}>
                {/* Auto-renews Toggle */}
                <View style={styles.toggleItemTop}>
                  <View style={styles.toggleTextContainer}>
                    <Ionicons name="refresh-outline" size={20} color={THEME.text.primary} style={styles.toggleIcon} />
                    <View>
                      <Text style={styles.toggleLabel}>Auto-renews</Text>
                    </View>
                  </View>
                  <Switch
                    value={autoRenews}
                    onValueChange={setAutoRenews}
                    trackColor={{ false: '#E9ECEF', true: 'rgba(132, 63, 222, 0.4)' }}
                    thumbColor={autoRenews ? THEME.primary : '#FFFFFF'}
                    ios_backgroundColor="#E9ECEF"
                  />
                </View>
                
                {/* Shared Subscription Toggle */}
                <View style={styles.toggleItemBottom}>
                  <View style={styles.toggleTextContainer}>
                    <Ionicons name="people-outline" size={20} color={THEME.text.primary} style={styles.toggleIcon} />
                    <View>
                      <Text style={styles.toggleLabel}>Shared Subscription</Text>
                    </View>
                  </View>
                  <Switch
                    value={isShared}
                    onValueChange={setIsShared}
                    trackColor={{ false: '#E9ECEF', true: 'rgba(132, 63, 222, 0.4)' }}
                    thumbColor={isShared ? THEME.primary : '#FFFFFF'}
                    ios_backgroundColor="#E9ECEF"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Max Members (conditional) */}
          {isShared && (
            <View style={styles.sectionNoBorder}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Maximum Members</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="people-outline" size={20} color={THEME.text.tertiary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={maxMembers}
                    onChangeText={setMaxMembers}
                    placeholder="5"
                    keyboardType="number-pad"
                    placeholderTextColor={THEME.text.tertiary}
                  />
                </View>
                <Text style={styles.helperText}>Including yourself as the admin</Text>
              </View>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddSubscription}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.addButtonText}>Add Subscription</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Custom Date Picker Modal */}
      <Modal
        visible={showDateModal}
        transparent={true}
        animationType="fade"
      >
        <TouchableWithoutFeedback onPress={() => setShowDateModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Start Date</Text>
                  <TouchableOpacity 
                    onPress={() => setShowDateModal(false)}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={24} color={THEME.text.tertiary} />
                  </TouchableOpacity>
                </View>
                
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
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontFamily: fontStyles.medium,
    fontSize: 15,
    color: THEME.text.secondary,
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: fontStyles.regular,
    fontSize: 16,
    color: THEME.text.primary,
    paddingVertical: 14,
  },
  categoryTableContainer: {
    flexDirection: 'column',
    marginTop: 6,
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
  },
  categoryRow: {
    flexDirection: 'row',
    width: '100%',
  },
  categoryTableItem: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: 44,
  },
  categoryIcon: {
    marginRight: 6,
    fontSize: 20,
  },
  categoryButtonText: {
    fontFamily: fontStyles.medium,
    fontSize: 13,
    color: THEME.text.secondary,
  },
  categoryButtonTextSelected: {
    color: '#843FDE',
  },
  frequencyTableContainer: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 6,
    borderRadius: 10,
    overflow: 'hidden',
  },
  frequencyTableItem: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
  },
  frequencyButtonText: {
    fontFamily: fontStyles.medium,
    fontSize: 13,
    color: THEME.text.secondary,
    textAlign: 'center',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  disabledInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  dateText: {
    fontFamily: fontStyles.regular,
    fontSize: 16,
    color: THEME.text.primary,
  },
  togglesContainer: {
    flexDirection: 'column',
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
  },
  toggleItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    borderBottomWidth: 0,
  },
  toggleItemBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  toggleTextContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  toggleIcon: {
    marginRight: 12,
    marginTop: 2, // Align icon with the first line of text
  },
  toggleLabel: {
    fontFamily: fontStyles.medium,
    fontSize: 15,
    color: THEME.text.primary,
    marginBottom: 4,
  },
  addButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.primary,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonIcon: {
    marginRight: 8,
  },
  addButtonText: {
    fontFamily: fontStyles.semiBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    padding: 24,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: fontStyles.semiBold,
    fontSize: 18,
    color: THEME.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  dateInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  dateInputGroup: {
    width: '30%',
  },
  dateInputLabel: {
    fontFamily: fontStyles.medium,
    fontSize: 14,
    color: THEME.text.tertiary,
    marginBottom: 8,
  },
  dateInput: {
    backgroundColor: THEME.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontFamily: fontStyles.regular,
    fontSize: 16,
    color: THEME.text.primary,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginLeft: 12,
  },
  cancelButton: {
    backgroundColor: THEME.background,
  },
  cancelButtonText: {
    fontFamily: fontStyles.medium,
    fontSize: 15,
    color: THEME.text.secondary,
  },
  confirmButton: {
    backgroundColor: THEME.primary,
  },
  confirmButtonText: {
    fontFamily: fontStyles.medium,
    fontSize: 15,
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  sectionNoBorder: {
    marginBottom: 16,
    paddingBottom: 16,
  },
  helperText: {
    fontFamily: fontStyles.regular,
    fontSize: 14,
    color: THEME.text.tertiary,
    marginTop: 8,
  },
  toggleDescription: {
    fontFamily: fontStyles.regular,
    fontSize: 14,
    color: THEME.text.tertiary,
  },
  categoryGridItemSelected: {
    backgroundColor: '#F6F0FD', // Light purple background
    zIndex: 1, // Ensure selected item appears above others
    elevation: 1, // For Android
  },
  renewalDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  renewalDateLabel: {
    fontFamily: fontStyles.regular,
    fontSize: 14,
    color: THEME.text.tertiary,
  },
  renewalDateText: {
    fontFamily: fontStyles.regular,
    fontSize: 14,
    color: THEME.text.primary,
  },
}); 