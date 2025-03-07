import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainTabParamList } from '../navigation/AppNavigator';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';
import { invitationService } from '../services/invitationService';
import { RealtimeChannel } from '@supabase/supabase-js';

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
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);

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
      
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          subscription:subscription_id (
            name,
            cost,
            renewal_frequency
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      } else {
        console.log('Notifications fetched:', data?.length || 0);
        console.log('Notification data:', data);
        setNotifications(data || []);
      }
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
    
    // Set the processing state to show loading indicator
    setProcessingInvitation(notification.notification_id);
    
    try {
      console.log('Accepting invitation for subscription:', notification.subscription_id);
      
      // Update the invitation status
      const result = await invitationService.updateInvitationStatus(
        notification.subscription_id,
        user.id,
        'accepted'
      );
      
      console.log('Invitation acceptance result:', result);
      
      if (result.success) {
        // No need to manually update notification status as the RPC function handles it
        
        // Refresh notifications
        fetchNotifications();
        
        Alert.alert(
          'Invitation Accepted',
          `You have joined the ${notification.subscription?.name} subscription.`
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to accept invitation');
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      Alert.alert('Error', 'An unexpected error occurred while accepting the invitation.');
    } finally {
      // Clear the processing state
      setProcessingInvitation(null);
    }
  };

  const handleRejectInvitation = async (notification: Notification) => {
    if (!user) return;
    
    // Set the processing state to show loading indicator
    setProcessingInvitation(notification.notification_id);
    
    try {
      console.log('Rejecting invitation for subscription:', notification.subscription_id);
      
      // Update the invitation status
      const result = await invitationService.updateInvitationStatus(
        notification.subscription_id,
        user.id,
        'rejected'
      );
      
      console.log('Invitation rejection result:', result);
      
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
      Alert.alert('Error', 'An unexpected error occurred while rejecting the invitation.');
    } finally {
      // Clear the processing state
      setProcessingInvitation(null);
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
    const isProcessing = processingInvitation === item.notification_id;
    
    return (
      <View style={[styles.notificationItem, isUnread && styles.unreadItem]}>
        {isUnread && <View style={styles.unreadDot} />}
        
        <Text style={styles.notificationMessage}>{item.message}</Text>
        <Text style={styles.notificationTime}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
        
        {isInvite && isUnread ? (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.acceptButton, isProcessing && styles.disabledButton]}
              onPress={() => handleAcceptInvitation(item)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.acceptButtonText}>Accept</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.rejectButton, isProcessing && styles.disabledButton]}
              onPress={() => handleRejectInvitation(item)}
              disabled={isProcessing}
            >
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        ) : (
          isUnread && (
            <TouchableOpacity
              style={styles.markReadButton}
              onPress={() => handleMarkAsRead(item)}
            >
              <Text style={styles.markReadButtonText}>Mark as Read</Text>
            </TouchableOpacity>
          )
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#008CFF" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchNotifications}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={item => item.notification_id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#008CFF']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {error ? 'Unable to load notifications' : 'No notifications yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {error 
                ? 'Please try refreshing or check back later' 
                : 'When you receive invitations or updates, they\'ll appear here'}
            </Text>
            {!error && notifications.length === 0 && (
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={handleRefresh}
              >
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
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
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80, // Space for bottom tabs
  },
  notificationItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
  },
  unreadItem: {
    backgroundColor: '#f0f7ff',
  },
  unreadDot: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#008CFF',
  },
  notificationMessage: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    paddingLeft: 12,
  },
  notificationTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    paddingLeft: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  acceptButton: {
    backgroundColor: '#008CFF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  rejectButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  rejectButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  markReadButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  markReadButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
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
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 16,
    borderRadius: 8,
    margin: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#d32f2f',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  refreshButton: {
    backgroundColor: '#008CFF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
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
  disabledButton: {
    opacity: 0.6,
  },
}); 