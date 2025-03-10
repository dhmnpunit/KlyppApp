import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  Animated 
} from 'react-native';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { colors, textStyles } from '../utils/globalStyles';
import { Subscription } from '../store/subscriptionStore';

interface DailyDetailsProps {
  date: Date;
  subscriptions: Subscription[];
  onSubscriptionPress: (subscription: Subscription) => void;
  translateY: Animated.Value;
}

interface SubscriptionItemProps {
  subscription: Subscription;
  onPress: (subscription: Subscription) => void;
}

const SubscriptionItem: React.FC<SubscriptionItemProps> = ({ 
  subscription, 
  onPress 
}) => (
  <TouchableOpacity 
    style={styles.subscriptionItem}
    onPress={() => onPress(subscription)}
  >
    <View style={styles.subscriptionIcon}>
      <Ionicons 
        name={subscription.is_shared ? "people" : "card"} 
        size={24} 
        color={colors.primary} 
      />
    </View>
    <View style={styles.subscriptionInfo}>
      <Text style={styles.subscriptionName}>
        {subscription.name}
      </Text>
      <Text style={styles.subscriptionDetails}>
        {subscription.renewal_frequency} • ${subscription.cost.toFixed(2)}
      </Text>
    </View>
    <Ionicons 
      name="chevron-forward" 
      size={20} 
      color={colors.text.tertiary} 
    />
  </TouchableOpacity>
);

export const DailyDetails: React.FC<DailyDetailsProps> = ({
  date,
  subscriptions,
  onSubscriptionPress,
  translateY
}) => {
  const daySubscriptions = subscriptions.filter(sub => {
    const renewalDate = new Date(sub.next_renewal_date);
    return format(renewalDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
  });

  const totalAmount = daySubscriptions.reduce((sum, sub) => sum + sub.cost, 0);

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          transform: [{ translateY }]
        }
      ]}
    >
      <View style={styles.handle} />
      
      <View style={styles.header}>
        <Text style={styles.dateText}>
          {format(date, 'EEEE, MMMM d')}
        </Text>
        <Text style={styles.totalText}>
          ${totalAmount.toFixed(2)}
        </Text>
      </View>

      {daySubscriptions.length > 0 ? (
        <FlatList
          data={daySubscriptions}
          renderItem={({ item }) => (
            <SubscriptionItem
              subscription={item}
              onPress={onSubscriptionPress}
            />
          )}
          keyExtractor={item => item.subscription_id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons 
            name="calendar-outline" 
            size={48} 
            color={colors.text.tertiary} 
          />
          <Text style={styles.emptyText}>
            No subscriptions due today
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    height: '50%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    ...textStyles.h3,
    color: colors.text.primary,
  },
  totalText: {
    ...textStyles.h3,
    color: colors.primary,
  },
  listContent: {
    paddingVertical: 8,
  },
  subscriptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: 8,
  },
  subscriptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionName: {
    ...textStyles.body,
    color: colors.text.primary,
    marginBottom: 2,
  },
  subscriptionDetails: {
    ...textStyles.caption,
    color: colors.text.tertiary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  emptyText: {
    ...textStyles.body,
    color: colors.text.tertiary,
    marginTop: 12,
  },
}); 