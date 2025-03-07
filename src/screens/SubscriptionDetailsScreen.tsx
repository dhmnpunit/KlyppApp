import React, { useEffect, useState } from 'react';
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
import { RealtimeChannel } from '@supabase/supabase-js';

// Define types for subscription members
interface SubscriptionMember {
  user_id: string;
  status: string;
  joined_at: string | null;
  users?: {
    username?: string | null;
    name?: string | null;
  };
}

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
  const [members, setMembers] = useState<SubscriptionMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showDebug, setShowDebug] = useState(false);

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
    const sub = getSubscriptionById(subscriptionId);
    if (sub) {
      setSubscription(sub);
      
      // Check if current user is the admin
      if (currentUserId && sub.admin_id) {
        const adminCheck = currentUserId === sub.admin_id;
        setIsAdmin(adminCheck);
      }
    }
  }, [subscriptionId, getSubscriptionById, currentUserId]);

  // Function to fetch subscription members
  const fetchMembers = async () => {
    if (!subscriptionId) return;
    
    setMembersLoading(true);
    try {
      console.log('Fetching members for subscription:', subscriptionId);
      const result = await invitationService.getSubscriptionMembers(subscriptionId);
      console.log('Members fetch result:', result);
      if (result.success && result.data) {
        // Log the structure of the first member to understand the data format
        if (result.data.length > 0) {
          console.log('First member structure:', JSON.stringify(result.data[0], null, 2));
        }
        setMembers(result.data as SubscriptionMember[]);
      } else {
        console.error('Error fetching members:', result.error);
      }
    } catch (error) {
      console.error('Error in fetchMembers:', error);
    } finally {
      setMembersLoading(false);
    }
  };

  // Fetch members when the component mounts or subscription ID changes
  useEffect(() => {
    fetchMembers();
    
    // Set up real-time subscription for member changes
    let memberSubscription: RealtimeChannel | null = null;
    
    try {
      console.log('Setting up real-time subscription for members of subscription:', subscriptionId);
      memberSubscription = supabase
        .channel(`subscription-members-${subscriptionId}`)
        .on(
          'postgres_changes',
          {
            event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'subscription_members',
            filter: `subscription_id=eq.${subscriptionId}`,
          },
          (payload) => {
            console.log('Subscription member change detected:', payload);
            // Refresh members list when changes occur
            fetchMembers();
          }
        )
        .subscribe((status) => {
          console.log('Member subscription status:', status);
        });
    } catch (error) {
      console.error('Error setting up real-time subscription for members:', error);
      // Continue without real-time updates
    }
    
    return () => {
      if (memberSubscription) {
        console.log('Removing member subscription channel');
        supabase.removeChannel(memberSubscription);
      }
    };
  }, [subscriptionId]);

  const handleDeleteSubscription = () => {
    Alert.alert(
      'Delete Subscription',
      'Are you sure you want to delete this subscription?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSubscription(subscriptionId);
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting subscription:', error);
              Alert.alert('Error', 'Failed to delete subscription');
            }
          },
        },
      ]
    );
  };

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
      // Check if the subscription has a max_members limit
      if (subscription?.is_shared && subscription?.max_members) {
        // Get current member count
        const currentMemberCount = members.length;
        
        // Check if adding one more would exceed the limit
        if (currentMemberCount >= subscription.max_members) {
          Alert.alert(
            'Member Limit Reached', 
            `This subscription has a limit of ${subscription.max_members} members. You cannot invite more members.`
          );
          return;
        }
      }
      
      // Use the invitationService to invite the user
      const result = await invitationService.inviteUserByUsername(subscriptionId, inviteUsername.trim());
      
      if (result.success) {
        Alert.alert('Success', `Invitation sent to ${inviteUsername}. They will receive a notification to join the subscription.`);
        setInviteUsername('');
        setShowInviteModal(false);
        
        // Refresh the members list
        fetchMembers();
      } else {
        Alert.alert('Error', result.error || 'Failed to invite user');
      }
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

    const handleRemoveMember = async (userId: string, username: string) => {
      Alert.alert(
        'Remove Member',
        `Are you sure you want to remove ${username} from this subscription?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                const result = await invitationService.removeMember(subscriptionId, userId);
                if (result.success) {
                  Alert.alert('Success', 'Member removed successfully');
                  fetchMembers(); // Refresh the members list
                } else {
                  Alert.alert('Error', result.error || 'Failed to remove member');
                }
              } catch (error) {
                console.error('Error removing member:', error);
                Alert.alert('Error', 'An unexpected error occurred');
              }
            },
          },
        ]
      );
    };

    const handleLeaveSubscription = async () => {
      Alert.alert(
        'Leave Subscription',
        'Are you sure you want to leave this subscription?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: async () => {
              try {
                const result = await invitationService.leaveSubscription(subscriptionId);
                if (result.success) {
                  Alert.alert('Success', 'You have left the subscription');
                  navigation.goBack(); // Go back to the previous screen
                } else {
                  Alert.alert('Error', result.error || 'Failed to leave subscription');
                }
              } catch (error) {
                console.error('Error leaving subscription:', error);
                Alert.alert('Error', 'An unexpected error occurred');
              }
            },
          },
        ]
      );
    };

    return (
      <View style={styles.membersContainer}>
        {members.map((member) => (
          <View key={member.user_id} style={styles.memberItem}>
            <View style={styles.memberAvatar}>
              <Text style={styles.memberAvatarText}>
                {member.users?.username?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>
                {member.users?.name || member.users?.username || 'Unknown User'}
              </Text>
              <Text style={styles.memberStatus}>
                {member.status === 'accepted' ? 'Member' : 'Pending'}
              </Text>
            </View>
            
            {/* Admin can remove members */}
            {isAdmin && member.user_id !== currentUserId && (
              <TouchableOpacity
                style={styles.removeMemberButton}
                onPress={() => handleRemoveMember(
                  member.user_id, 
                  member.users?.name || member.users?.username || 'this user'
                )}
              >
                <Text style={styles.removeMemberButtonText}>Remove</Text>
              </TouchableOpacity>
            )}
            
            {/* Current user can leave if they're not the admin */}
            {!isAdmin && member.user_id === currentUserId && (
              <TouchableOpacity
                style={styles.leaveButton}
                onPress={handleLeaveSubscription}
              >
                <Text style={styles.leaveButtonText}>Leave</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
    );
  };

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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
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

  // Direct check for admin status in render method
  const isCurrentUserAdmin = currentUserId && currentUserId === subscription.admin_id;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{subscription.name}</Text>
      </View>

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
              onPress={handleDeleteSubscription}
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
    marginTop: 8,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#008CFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  memberStatus: {
    fontSize: 14,
    color: '#666',
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
  removeMemberButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginLeft: 'auto',
  },
  removeMemberButtonText: {
    color: '#ff3b30',
    fontSize: 14,
    fontWeight: '500',
  },
  leaveButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginLeft: 'auto',
  },
  leaveButtonText: {
    color: '#ff3b30',
    fontSize: 14,
    fontWeight: '500',
  },
}); 