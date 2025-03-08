import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  ActivityIndicator,
  Share,
  TextInput,
  Modal
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../navigation/AppNavigator';
import { useSubscriptionStore, Subscription } from '../store/subscriptionStore';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';
import { invitationService } from '../services/invitationService';
import { useAlert } from '../context/AlertContext';

type SubscriptionDetailsScreenNavigationProp = NativeStackNavigationProp<
  MainStackParamList,
  'SubscriptionDetails'
>;

type SubscriptionDetailsScreenRouteProp = RouteProp<
  MainStackParamList,
  'SubscriptionDetails'
>;

export const SubscriptionDetailsScreen = () => {
  const navigation = useNavigation<SubscriptionDetailsScreenNavigationProp>();
  const route = useRoute<SubscriptionDetailsScreenRouteProp>();
  const { subscriptionId } = route.params;
  
  const { 
    getSubscriptionById, 
    updateSubscription, 
    deleteSubscription, 
    loading: subscriptionLoading, 
    error: subscriptionError 
  } = useSubscriptionStore();
  
  const { user, loading: authLoading, error: authError } = useAuthStore();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  
  // Use the alert context instead of local state
  const { showAlert } = useAlert();

  // Define fetchMembers outside useEffect so it can be called from other functions
  const fetchMembers = async () => {
    if (!subscriptionId) return;
    
    setMembersLoading(true);
    try {
      console.log('Fetching members for subscription:', subscriptionId);
      const result = await invitationService.getSubscriptionMembers(subscriptionId);
      console.log('Members fetch result:', result);
      if (result.success && result.data) {
        setMembers(result.data);
      } else {
        console.error('Error fetching members:', result.error);
      }
    } catch (error) {
      console.error('Error in fetchMembers:', error);
    } finally {
      setMembersLoading(false);
    }
  };

  // Get current user ID directly from Supabase
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Error getting user:', error);
          setError(error.message);
          return;
        }
        
        if (data && data.user) {
          console.log('Current user ID:', data.user.id);
          setCurrentUserId(data.user.id);
        } else {
          console.log('No user found');
        }
      } catch (err) {
        console.error('Error in getCurrentUser:', err);
      } finally {
        setLoading(false);
      }
    };

    getCurrentUser();
  }, []);

  useEffect(() => {
    // Get subscription details
    const loadSubscription = async () => {
      setLoading(true);
      try {
        // First try to get from local state
        const sub = getSubscriptionById(subscriptionId);
        
        if (sub) {
          console.log('Subscription found in local state:', sub);
          setSubscription(sub);
          
          // Check if current user is the admin
          if (currentUserId && sub.admin_id) {
            const adminCheck = currentUserId === sub.admin_id;
            setIsAdmin(adminCheck);
            console.log('Is current user admin?', adminCheck);
          }
        } else {
          // If not found in local state, fetch directly from database
          console.log('Subscription not found in local state, fetching from database');
          const { data, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('subscription_id', subscriptionId)
            .single();
            
          if (error) {
            console.error('Error fetching subscription:', error);
            setError('Failed to load subscription details');
          } else if (data) {
            console.log('Subscription fetched from database:', data);
            setSubscription(data);
            
            // Check if current user is the admin
            if (currentUserId && data.admin_id) {
              const adminCheck = currentUserId === data.admin_id;
              setIsAdmin(adminCheck);
              console.log('Is current user admin?', adminCheck);
            }
          }
        }
      } catch (err) {
        console.error('Error in loadSubscription:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (subscriptionId && currentUserId) {
      loadSubscription();
    }
  }, [subscriptionId, getSubscriptionById, currentUserId]);

  // Add a new useEffect to fetch subscription members
  useEffect(() => {
    fetchMembers();
  }, [subscriptionId]);

  const handleShareSubscription = async () => {
    if (!subscription) return;

    try {
      const result = await Share.share({
        message: `Join my ${subscription.name} subscription on Klypp!`,
        // In a real app, you would generate a deep link here
        url: `klypp://subscription/${subscriptionId}`,
      });
    } catch (error) {
      console.error('Error sharing subscription:', error);
      Alert.alert('Error', 'Failed to share subscription');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const handleInviteUser = async () => {
    if (!inviteUsername.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    setInviteLoading(true);
    try {
      const username = inviteUsername.trim();
      console.log('Inviting user:', username, 'to subscription:', subscriptionId);
      
      // First, check if the user exists
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_id')
        .eq('username', username);
      
      if (userError) {
        console.error('Error checking if user exists:', userError);
        Alert.alert('Error', 'Could not check if user exists. Please try again.');
        return;
      }
      
      if (!userData || userData.length === 0) {
        console.log('User not found:', username);
        Alert.alert('User Not Found', `No user found with username "${username}". Please check the username and try again.`);
        return;
      }
      
      // User exists, get their ID
      const userId = userData[0].user_id;
      console.log('User found with ID:', userId);
      
      // Check if the user is already a member
      const { data: memberData, error: memberError } = await supabase
        .from('subscription_members')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .eq('user_id', userId);
        
      if (memberError) {
        console.error('Error checking membership:', memberError);
        Alert.alert('Error', 'Could not check if user is already a member. Please try again.');
        return;
      }
      
      if (memberData && memberData.length > 0) {
        console.log('User is already a member:', memberData);
        Alert.alert('Already a Member', `User "${username}" is already a member of this subscription.`);
        return;
      }
      
      // Add the user to subscription_members
      const { data: insertData, error: insertError } = await supabase
        .from('subscription_members')
        .insert([
          {
            subscription_id: subscriptionId,
            user_id: userId,
            status: 'pending',
          },
        ])
        .select();
        
      if (insertError) {
        console.error('Error adding member:', insertError);
        Alert.alert('Error', 'Could not add user as a member. Please try again.');
        return;
      }
      
      console.log('Member added successfully:', insertData);
      
      // Create a notification for the user
      const { data: notificationData, error: notificationError } = await supabase
        .from('notifications')
        .insert([
          {
            user_id: userId,
            subscription_id: subscriptionId,
            message: `You have been invited to join the ${subscription?.name} subscription`,
            type: 'invite',
            status: 'unread',
          },
        ])
        .select();
        
      if (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Continue anyway as the member has been added
      } else {
        console.log('Notification created successfully:', notificationData);
      }
      
      // Success!
      Alert.alert('Success', `Invitation sent to ${username}. They will receive a notification to join the subscription.`);
      setInviteUsername('');
      setShowInviteModal(false);
      
      // Refresh the members list
      fetchMembers();
      
    } catch (error) {
      console.error('Error inviting user:', error);
      Alert.alert('Error', 'An unexpected error occurred while sending the invitation. Please try again later.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleConvertToShared = async () => {
    if (!subscription) return;
    
    try {
      // Update the subscription to be shared
      await updateSubscription(subscription.subscription_id, {
        is_shared: true,
        max_members: 5, // Default max members
      });
      
      // Refresh the subscription details
      const updatedSubscription = getSubscriptionById(subscriptionId);
      if (updatedSubscription) {
        setSubscription(updatedSubscription);
        Alert.alert(
          'Success',
          'Subscription converted to shared. You can now invite members.'
        );
      }
    } catch (error) {
      console.error('Error converting subscription to shared:', error);
      Alert.alert('Error', 'Failed to convert subscription to shared');
    }
  };

  const fetchAllUsers = async () => {
    try {
      console.log('Fetching all users...');
      const { data, error } = await supabase
        .from('users')
        .select('user_id, username, name');
      
      if (error) {
        console.error('Error fetching all users:', error);
        Alert.alert('Error', 'Could not fetch users: ' + error.message);
        return;
      }
      
      console.log('Users found:', data?.length || 0, data);
      setAllUsers(data || []);
    } catch (error) {
      console.error('Error in fetchAllUsers:', error);
      Alert.alert('Error', 'An unexpected error occurred while fetching users');
    }
  };

  const renderInviteModal = () => (
    <Modal
      visible={showInviteModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowInviteModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Invite User</Text>
          
          <Text style={styles.modalLabel}>Username</Text>
          <TextInput
            style={styles.modalInput}
            value={inviteUsername}
            onChangeText={setInviteUsername}
            placeholder="Enter exact username"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.modalHelperText}>
            Enter the exact username of the person you want to invite.
            Make sure the username exists in the system.
          </Text>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowInviteModal(false)}
              disabled={inviteLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.inviteButton}
              onPress={handleInviteUser}
              disabled={inviteLoading}
            >
              {inviteLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.inviteButtonText}>Invite</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderDebugView = () => {
    if (!showDebug) return null;
    
    return (
      <View style={styles.debugContainer}>
        <Text style={styles.debugTitle}>Debug Information</Text>
        <Text style={styles.debugText}>All Users in System:</Text>
        {allUsers.map((user) => (
          <Text key={user.user_id} style={styles.debugUserText}>
            Username: {user.username || 'Not set'}, Name: {user.name || 'Not set'}
          </Text>
        ))}
        <TouchableOpacity
          style={styles.debugButton}
          onPress={fetchAllUsers}
        >
          <Text style={styles.debugButtonText}>Refresh Users</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.debugButton, { marginTop: 8 }]}
          onPress={() => setShowDebug(false)}
        >
          <Text style={styles.debugButtonText}>Hide Debug</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderMembers = () => {
    if (membersLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#008CFF" />
          <Text style={styles.loadingText}>Loading members...</Text>
        </View>
      );
    }

    if (members.length === 0) {
      return (
        <Text style={styles.noMembersText}>No members yet</Text>
      );
    }

    return (
      <View style={styles.membersContainer}>
        {members.map((member) => (
          <View key={member.user_id} style={styles.memberItem}>
            <View style={[
              styles.memberAvatar,
              member.isAdmin && styles.adminAvatar
            ]}>
              <Text style={[
                styles.memberAvatarText,
                member.isAdmin && styles.adminAvatarText
              ]}>
                {member.users?.username?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>
                {member.users?.name || member.users?.username || 'Unknown User'}
              </Text>
              <Text style={[
                styles.memberStatus,
                member.isAdmin && styles.adminStatus
              ]}>
                {member.isAdmin ? 'Admin' : member.status === 'accepted' ? 'Member' : 'Pending'}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  // Function to show delete confirmation
  const showDeleteConfirmation = useCallback(() => {
    console.log('showDeleteConfirmation called');
    const message = subscription?.is_shared
      ? `Are you sure you want to delete "${subscription.name}"? This will permanently remove the subscription and all members will lose access. This action cannot be undone.`
      : `Are you sure you want to delete "${subscription?.name}"? This action cannot be undone.`;
      
    showAlert(
      message,
      'Confirm Deletion',
      async () => {
        try {
          setLoading(true);
          console.log('Starting deletion process for subscription:', subscriptionId);
          
          const result = await deleteSubscription(subscriptionId);
          
          if (result.success) {
            console.log('Deletion successful, showing success message');
            showAlert('Subscription deleted successfully', 'Success', () => {
              navigation.goBack();
            });
          } else {
            console.error('Deletion failed with result:', result);
            
            // Extract a more detailed error message
            let errorMessage = 'Failed to delete subscription';
            
            if (result.error) {
              if (typeof result.error === 'object') {
                if ('message' in result.error) {
                  errorMessage = String(result.error.message);
                } else if ('details' in result.error) {
                  errorMessage = String(result.error.details);
                }
              } else {
                errorMessage = String(result.error);
              }
            }
            
            console.error('Showing error message:', errorMessage);
            showAlert(errorMessage, 'Error');
          }
        } catch (error) {
          console.error('Exception in delete process:', error);
          
          // Get a more detailed error message
          const errorMessage = error instanceof Error 
            ? error.message 
            : 'An unexpected error occurred';
            
          showAlert(errorMessage, 'Error');
        } finally {
          setLoading(false);
        }
      }
    );
  }, [subscription, subscriptionId, showAlert, deleteSubscription, navigation]);

  // Add a refresh function to allow users to manually refresh the members list
  const handleRefresh = useCallback(() => {
    console.log('Refreshing subscription details and members...');
    
    // Reload subscription details
    const loadSubscription = async () => {
      setLoading(true);
      try {
        // Fetch directly from database to ensure we have the latest data
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('subscription_id', subscriptionId)
          .single();
          
        if (error) {
          console.error('Error fetching subscription:', error);
          setError('Failed to load subscription details');
        } else if (data) {
          console.log('Subscription refreshed from database:', data);
          setSubscription(data);
          
          // Check if current user is the admin
          if (currentUserId && data.admin_id) {
            const adminCheck = currentUserId === data.admin_id;
            setIsAdmin(adminCheck);
            console.log('Is current user admin?', adminCheck);
          }
        }
      } catch (err) {
        console.error('Error in refreshing subscription:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    // Reload subscription details and members
    loadSubscription();
    fetchMembers();
  }, [subscriptionId, currentUserId, fetchMembers]);

  if (loading || subscriptionLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#008CFF" />
        <Text style={styles.loadingText}>Loading subscription details...</Text>
      </View>
    );
  }

  if (error || subscriptionError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error || subscriptionError}</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRefresh}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!subscription) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Subscription not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Use the isAdmin state that's set in useEffect instead of calculating it here
  // This ensures it's properly set even if the subscription is loaded from the database
  const isCurrentUserAdmin = isAdmin;

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={handleRefresh}
        >
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.title}>{subscription.name}</Text>
      
      <View style={styles.card}>
        <View style={styles.costContainer}>
          <Text style={styles.costLabel}>Cost</Text>
          <Text style={styles.costValue}>
            {formatCurrency(subscription.cost)}/{subscription.renewal_frequency}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Category</Text>
          <Text style={styles.detailValue}>{subscription.category}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Start Date</Text>
          <Text style={styles.detailValue}>{formatDate(subscription.start_date)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Next Renewal</Text>
          <Text style={styles.detailValue}>{formatDate(subscription.next_renewal_date)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Auto-Renews</Text>
          <Text style={styles.detailValue}>{subscription.auto_renews ? 'Yes' : 'No'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Shared</Text>
          <Text style={styles.detailValue}>{subscription.is_shared ? 'Yes' : 'No'}</Text>
        </View>

        {subscription.is_shared && subscription.max_members && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Max Members</Text>
            <Text style={styles.detailValue}>{subscription.max_members}</Text>
          </View>
        )}
      </View>

      {subscription.is_shared && (
        <View style={styles.membersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Members</Text>
            {isCurrentUserAdmin && (
              <TouchableOpacity 
                style={styles.addMemberButton}
                onPress={() => setShowInviteModal(true)}
              >
                <Text style={styles.addMemberButtonText}>+ Invite</Text>
              </TouchableOpacity>
            )}
          </View>
          {renderMembers()}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Actions</Text>
        
        {isCurrentUserAdmin ? (
          (() => {
            console.log('Rendering admin actions, isCurrentUserAdmin:', isCurrentUserAdmin);
            return (
              <View>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => navigation.navigate('EditSubscription', { subscriptionId })}
                >
                  <Text style={styles.editButtonText}>Edit Subscription</Text>
                </TouchableOpacity>

                {!subscription.is_shared && (
                  <TouchableOpacity
                    style={[styles.shareButton, { marginTop: 12 }]}
                    onPress={handleConvertToShared}
                  >
                    <Text style={styles.shareButtonText}>Convert to Shared</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.deleteButton, { marginTop: 12 }]}
                  onPress={() => {
                    console.log('Delete button pressed');
                    showDeleteConfirmation();
                  }}
                >
                  <Text style={styles.deleteButtonText}>Delete Subscription</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, { marginTop: 12 }]}
                  onPress={() => {
                    setShowDebug(true);
                    fetchAllUsers();
                  }}
                >
                  <Text style={styles.actionButtonText}>Show Debug Info</Text>
                </TouchableOpacity>
              </View>
            );
          })()
        ) : (
          <Text style={styles.emptyText}>
            Only the subscription admin can edit or delete this subscription.
          </Text>
        )}

        <TouchableOpacity
          style={[styles.actionButton, { marginTop: 12 }]}
          onPress={handleShareSubscription}
        >
          <Text style={styles.actionButtonText}>Share via Message</Text>
        </TouchableOpacity>
      </View>

      {renderDebugView()}
      {renderInviteModal()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginBottom: 8,
  },
  backButtonText: {
    color: '#008CFF',
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  costContainer: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  costLabel: {
    fontSize: 14,
    color: '#666',
  },
  costValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#008CFF',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  shareButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  actionContainer: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 32,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  editButton: {
    backgroundColor: '#008CFF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#f44336',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteButtonText: {
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    marginBottom: 16,
    textAlign: 'center',
  },
  membersSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addMemberButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addMemberButtonText: {
    color: '#008CFF',
    fontSize: 14,
    fontWeight: '500',
  },
  membersContainer: {
    marginBottom: 8,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3498DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  adminAvatar: {
    backgroundColor: '#E74C3C', // Different color for admin
  },
  memberAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  adminAvatarText: {
    color: '#fff',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  memberStatus: {
    fontSize: 12,
    color: '#666',
  },
  adminStatus: {
    color: '#E74C3C',
    fontWeight: 'bold',
  },
  noMembersText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  inviteButton: {
    backgroundColor: '#008CFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  actionButton: {
    backgroundColor: '#008CFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  modalHelperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginBottom: 16,
  },
  debugContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  debugTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  debugText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  debugUserText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  debugButton: {
    backgroundColor: '#333',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 16,
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  refreshButton: {
    backgroundColor: '#008CFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#008CFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
}); 