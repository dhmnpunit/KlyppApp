import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Platform
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainTabParamList } from '../navigation/AppNavigator';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';
import { invitationService } from '../services/invitationService';
import { RealtimeChannel } from '@supabase/supabase-js';
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

type NotificationsScreenNavigationProp = NativeStackNavigationProp<MainTabParamList, 'Notifications'>;

interface Notification {
  notification_id: string;
  user_id: string;
  subscription_id: string;
  message: string;
  type: string;
  status: string;
  created_at: string;
  subscription?: {
    name: string;
    cost: number;
    renewal_frequency: string;
  };
}

export const NotificationsScreen = () => {
  const navigation = useNavigation<NotificationsScreenNavigationProp>();
  const { user } = useAuthStore();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching notifications for user:', user.id);
      
      // First check if the notifications table exists
      const { error: tableCheckError } = await supabase
        .from('notifications')
        .select('count')
        .limit(1)
        .single();
      
      if (tableCheckError && tableCheckError.code === '42P01') {
        console.warn('Notifications table does not exist yet. This is expected in development.');
        setError('Notifications table does not exist. Please set up your Supabase tables.');
        setNotifications([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      const { data: notificationsData, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }

      // If no notifications, set empty array and return
      if (!notificationsData || notificationsData.length === 0) {
        setNotifications([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Fetch subscription details for each notification
      const notificationsWithSubscriptions = await Promise.all(
        notificationsData.map(async (notification) => {
          // Skip if no subscription_id
          if (!notification.subscription_id) {
            return notification;
          }

          const { data: subscriptionData, error: subscriptionError } = await supabase
            .from('subscriptions')
            .select('name, cost, renewal_frequency')
            .eq('subscription_id', notification.subscription_id)
            .single();
          
          if (subscriptionError) {
            console.warn(`Error fetching subscription ${notification.subscription_id}:`, subscriptionError);
            return notification;
          }
          
          return {
            ...notification,
            subscription: subscriptionData
          };
        })
      );
      
      setNotifications(notificationsWithSubscriptions);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch notifications');
      // Set empty notifications array to prevent infinite loading
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  // Use useFocusEffect to fetch notifications whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('Notifications screen is focused, fetching notifications');
      fetchNotifications();
      
      return () => {
        // Optional cleanup
        console.log('Notifications screen is unfocused');
      };
    }, [user])
  );
  
  // Set up real-time subscription for new notifications
  useEffect(() => {
    let subscription: RealtimeChannel | null = null;
    
    const setupRealtimeSubscription = async () => {
      try {
        if (user?.id) {
          console.log('Setting up real-time subscription for user:', user.id);
          
          // First, ensure we're unsubscribed from any previous channels
          if (subscription) {
            await supabase.removeChannel(subscription);
          }
          
          subscription = supabase
            .channel(`notifications-${user.id}`) // Use unique channel name
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${user.id}`,
              },
              (payload) => {
                console.log('Notification change detected:', payload);
                // Refresh notifications when changes occur
                fetchNotifications();
              }
            )
            .subscribe((status) => {
              console.log('Subscription status:', status);
            });
        }
      } catch (error) {
        console.error('Error setting up real-time subscription:', error);
        // Continue without real-time updates
      }
    };
    
    setupRealtimeSubscription();
    
    return () => {
      if (subscription) {
        console.log('Removing subscription channel');
        supabase.removeChannel(subscription);
      }
    };
  }, [user]);

  // Add a fallback to prevent infinite loading
  useEffect(() => {
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.log('Loading timeout reached, forcing state update');
        setLoading(false);
        if (notifications.length === 0) {
          setError('Loading timed out. Please try refreshing.');
        }
      }
    }, 10000); // 10 seconds timeout
    
    return () => clearTimeout(loadingTimeout);
  }, [loading]);

  const handleAcceptInvitation = async (notification: Notification) => {
    if (!user) return;
    
    try {
      // Update the invitation status
      const result = await invitationService.updateInvitationStatus(
        notification.subscription_id,
        user.id,
        'accepted'
      );
      
      if (result.success) {
        // Mark notification as read
        await supabase
          .from('notifications')
          .update({ status: 'read' })
          .eq('notification_id', notification.notification_id);
        
        // Refresh notifications
        fetchNotifications();
        
        Alert.alert(
          'Invitation Accepted',
          `You have joined the ${notification.subscription?.name} subscription.`,
          [
            {
              text: 'View Subscriptions',
              onPress: () => {
                // Navigate to the Dashboard tab
                navigation.navigate('Dashboard');
              },
            },
            {
              text: 'OK',
              style: 'cancel',
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to accept invitation');
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const handleRejectInvitation = async (notification: Notification) => {
    if (!user) return;
    
    try {
      // Update the invitation status
      const result = await invitationService.updateInvitationStatus(
        notification.subscription_id,
        user.id,
        'rejected'
      );
      
      if (result.success) {
        // Mark notification as read
        await supabase
          .from('notifications')
          .update({ status: 'read' })
          .eq('notification_id', notification.notification_id);
        
        // Refresh notifications
        fetchNotifications();
        
        Alert.alert(
          'Invitation Rejected',
          `You have declined the invitation to join the ${notification.subscription?.name} subscription.`
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to reject invitation');
      }
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const handleMarkAsRead = async (notification: Notification) => {
    try {
      await supabase
        .from('notifications')
        .update({ status: 'read' })
        .eq('notification_id', notification.notification_id);
      
      // Refresh notifications
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
      Alert.alert('Error', 'Failed to mark notification as read');
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => {
    const isUnread = item.status === 'unread';
    const isInvite = item.type === 'invite';
    
    // Format date to be more readable
    const formattedDate = new Date(item.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    // Get subscription name if available
    const subscriptionName = item.subscription?.name || '';
    
    return (
      <View style={[
        styles.notificationCard,
        isUnread && styles.notificationCardUnread
      ]}>
        {/* Left accent bar for unread notifications */}
        {isUnread && <View style={styles.unreadAccent} />}
        
        {/* Notification icon */}
        <View style={[
          styles.notificationIconContainer,
          isInvite ? styles.inviteIconContainer : styles.regularIconContainer
        ]}>
          <Ionicons 
            name={isInvite ? "person-add" : "notifications"} 
            size={20} 
            color={THEME.primary} 
          />
        </View>
        
        {/* Notification content */}
        <View style={styles.notificationContent}>
          {/* Message and subscription info */}
          <View style={styles.messageContainer}>
            <Text style={styles.notificationMessage}>{item.message}</Text>
            {subscriptionName && (
              <Text style={styles.subscriptionName}>
                {subscriptionName} • {item.subscription?.renewal_frequency}
              </Text>
            )}
          </View>
          
          {/* Time and status indicator */}
          <View style={styles.metaContainer}>
            <Text style={styles.notificationTime}>{formattedDate}</Text>
            {isUnread && <View style={styles.statusDot} />}
          </View>
          
          {/* Action buttons */}
          {isInvite && isUnread ? (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => handleAcceptInvitation(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => handleRejectInvitation(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.rejectButtonText}>Decline</Text>
              </TouchableOpacity>
            </View>
          ) : (
            isUnread && (
              <TouchableOpacity
                style={styles.markReadButton}
                onPress={() => handleMarkAsRead(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark" size={16} color={THEME.primary} />
                <Text style={styles.markReadButtonText}>Mark as Read</Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with title */}
      <View style={[styles.header, Platform.OS === 'android' && styles.headerAndroid]}>
        <Text style={styles.title}>Notifications</Text>
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle-outline" size={24} color="#E74C3C" />
          </View>
          <Text style={styles.errorTitle}>Unable to load notifications</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchNotifications}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={16} color="#FFFFFF" style={styles.refreshIcon} />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[THEME.primary]}
          />
        }
      >
        {notifications.length > 0 ? (
          notifications.map(item => (
            <View key={item.notification_id}>
              {renderNotificationItem({ item })}
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="notifications-outline" size={32} color={THEME.primary} />
            </View>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyMessage}>
              When you receive invitations or updates, they'll appear here
            </Text>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={handleRefresh}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh-outline" size={16} color="#FFFFFF" style={styles.refreshIcon} />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
  title: {
    fontFamily: fontStyles.semiBold,
    fontSize: 20,
    color: THEME.text.primary,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  notificationCard: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.border,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 0,
      }
    })
  },
  notificationCardUnread: {
    backgroundColor: 'rgba(132, 63, 222, 0.03)', // Very light purple for unread items
  },
  unreadAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: THEME.primary,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 16,
  },
  inviteIconContainer: {
    backgroundColor: 'rgba(132, 63, 222, 0.08)',
  },
  regularIconContainer: {
    backgroundColor: 'rgba(132, 63, 222, 0.08)',
  },
  notificationContent: {
    flex: 1,
    padding: 16,
    paddingLeft: 0,
  },
  messageContainer: {
    marginBottom: 8,
  },
  notificationMessage: {
    fontFamily: fontStyles.medium,
    fontSize: 15,
    color: THEME.text.primary,
    marginBottom: 4,
    lineHeight: 20,
  },
  subscriptionName: {
    fontFamily: fontStyles.regular,
    fontSize: 13,
    color: THEME.text.tertiary,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  notificationTime: {
    fontFamily: fontStyles.regular,
    fontSize: 13,
    color: THEME.text.tertiary,
    marginRight: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: THEME.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  acceptButtonText: {
    fontFamily: fontStyles.medium,
    color: '#fff',
    fontSize: 14,
  },
  rejectButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  rejectButtonText: {
    fontFamily: fontStyles.medium,
    color: THEME.text.tertiary,
    fontSize: 14,
  },
  markReadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  markReadButtonText: {
    fontFamily: fontStyles.medium,
    color: THEME.primary,
    fontSize: 13,
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.background,
    padding: 20,
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    borderRadius: 16,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    width: '80%',
    maxWidth: 300,
  },
  loadingText: {
    marginTop: 16,
    fontFamily: fontStyles.medium,
    fontSize: 16,
    color: THEME.text.secondary,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: 'rgba(231, 76, 60, 0.05)',
    borderRadius: 16,
    margin: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.1)',
  },
  errorIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontFamily: fontStyles.semiBold,
    fontSize: 18,
    color: '#E74C3C',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontFamily: fontStyles.regular,
    color: THEME.text.secondary,
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E74C3C',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  retryButtonText: {
    fontFamily: fontStyles.medium,
    color: '#FFFFFF',
    fontSize: 15,
    marginLeft: 8,
  },
  refreshIcon: {
    marginRight: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontFamily: fontStyles.semiBold,
    fontSize: 20,
    color: THEME.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyMessage: {
    fontFamily: fontStyles.regular,
    fontSize: 15,
    color: THEME.text.tertiary,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 260,
    lineHeight: 22,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  refreshButtonText: {
    fontFamily: fontStyles.medium,
    color: '#FFFFFF',
    fontSize: 15,
  },
}); 