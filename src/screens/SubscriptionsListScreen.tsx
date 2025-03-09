import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { fontStyles, colors } from '../utils/globalStyles';
import type { MainStackParamList } from '../navigation/AppNavigator';

type SubscriptionsListScreenNavigationProp = NativeStackNavigationProp<MainStackParamList, 'SubscriptionsList'>;

export const SubscriptionsListScreen = () => {
  const navigation = useNavigation<SubscriptionsListScreenNavigationProp>();

  const handleAddNewSubscription = () => {
    navigation.navigate('AddSubscription');
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Add Subscription</Text>
          <Text style={styles.headerSubtitle}>
            Track your recurring expenses by adding your subscriptions
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.addNewButton}
          onPress={handleAddNewSubscription}
          activeOpacity={0.7}
        >
          <View style={styles.addIconContainer}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.addTextContainer}>
            <Text style={styles.addButtonTitle}>Add New Subscription</Text>
            <Text style={styles.addButtonSubtitle}>
              Manually add a subscription service
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#CCCCCC" />
        </TouchableOpacity>

        {/* Future feature: Popular subscriptions section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Popular Subscriptions</Text>
          <Text style={styles.comingSoonText}>Coming soon</Text>
        </View>

        {/* Future feature: Import from email section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Import from Email</Text>
          <Text style={styles.comingSoonText}>Coming soon</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F3F5',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  headerSection: {
    marginBottom: 24,
  },
  headerTitle: {
    fontFamily: fontStyles.bold,
    fontSize: 24,
    color: '#000000',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontFamily: fontStyles.regular,
    fontSize: 16,
    color: '#666666',
    lineHeight: 22,
  },
  addNewButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  addIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  addTextContainer: {
    flex: 1,
  },
  addButtonTitle: {
    fontFamily: fontStyles.semiBold,
    fontSize: 16,
    color: '#000000',
    marginBottom: 4,
  },
  addButtonSubtitle: {
    fontFamily: fontStyles.regular,
    fontSize: 14,
    color: '#666666',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: fontStyles.semiBold,
    fontSize: 18,
    color: '#000000',
    marginBottom: 12,
  },
  comingSoonText: {
    fontFamily: fontStyles.regular,
    fontSize: 14,
    color: '#888888',
    fontStyle: 'italic',
  },
}); 