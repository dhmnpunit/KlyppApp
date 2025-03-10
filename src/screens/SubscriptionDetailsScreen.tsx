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
  Modal,
  Platform
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../navigation/AppNavigator';
import { useSubscriptionStore, Subscription } from '../store/subscriptionStore';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';
import { invitationService } from '../services/invitationService';
import { useAlert } from '../context/AlertContext';
import { Ionicons } from '@expo/vector-icons';
import { fontStyles, colors } from '../utils/globalStyles';
import { LinearGradient } from 'expo-linear-gradient';

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
    // Hide the default navigation header
    navigation.setOptions({
      headerShown: false,
    });

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
  }, [navigation]);

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

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      console.error('Error formatting currency:', error);
      return `$${amount.toFixed(2)}`;
    }
  };
  
  // Helper function to format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  // Calculate annual cost for non-yearly subscriptions
  const calculateAnnualCost = (subscription: Subscription) => {
    const { cost, renewal_frequency } = subscription;
    switch (renewal_frequency) {
      case 'monthly':
        return cost * 12;
      case 'quarterly':
        return cost * 4;
      case 'yearly':
        return cost;
      default:
        return cost;
    }
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
      <View style={styles.modalContainer}>
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
          
          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowInviteModal(false)}
              disabled={inviteLoading}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.modalSubmitButton}
              onPress={handleInviteUser}
              disabled={inviteLoading}
            >
              {inviteLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.modalSubmitButtonText}>Invite</Text>
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
          style={styles.debugModalButton}
          onPress={fetchAllUsers}
        >
          <Text style={styles.debugButtonText}>Refresh Users</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.debugModalButton, { marginTop: 8 }]}
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
          <ActivityIndicator size="small" color={THEME.primary} />
          <Text style={styles.loadingText}>Loading members...</Text>
        </View>
      );
    }

    if (members.length === 0) {
      return (
        <View style={styles.emptyMembersContainer}>
          <Ionicons name="people-outline" size={24} color={THEME.text.tertiary} />
          <Text style={styles.noMembersText}>No members yet</Text>
        </View>
      );
    }

    return (
      <View style={styles.membersContainer}>
        {members.map((member, index) => (
          <View 
            key={member.user_id} 
            style={[
              styles.memberItem,
              index % 2 === 1 && styles.memberItemAlt
            ]}
          >
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
              {member.isAdmin && (
                <View style={styles.adminBadge}>
                </View>
              )}
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>
                {member.users?.name || member.users?.username || 'Unknown User'}
              </Text>
              <View style={styles.memberStatusContainer}>
                <View style={[
                  styles.statusIndicator,
                  { backgroundColor: member.status === 'accepted' ? '#4CAF50' : '#FFC107' }
                ]} />
                <Text style={styles.memberStatus}>
                  {member.isAdmin ? 'Admin' : member.status === 'accepted' ? 'Member' : 'Pending'}
                </Text>
              </View>
            </View>
            {isCurrentUserAdmin && !member.isAdmin && (
              <TouchableOpacity 
                style={styles.memberActionButton}
                accessibilityLabel="Member options"
                accessibilityRole="button"
              >
                <Ionicons name="ellipsis-vertical" size={18} color={THEME.text.tertiary} />
              </TouchableOpacity>
            )}
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

  if (loading || subscriptionLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.loadingText}>Loading subscription details...</Text>
        </View>
      </View>
    );
  }

  if (error || subscriptionError) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorContent}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle-outline" size={32} color="#f44336" />
          </View>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error || subscriptionError}</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back-outline" size={18} color={THEME.text.secondary} style={styles.buttonIcon} />
              <Text style={styles.actionButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (!subscription) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorContent}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="search-outline" size={32} color={THEME.text.tertiary} />
          </View>
          <Text style={styles.errorTitle}>Subscription Not Found</Text>
          <Text style={styles.errorText}>The subscription you're looking for could not be found.</Text>
          <TouchableOpacity
            style={[styles.actionButton, { marginTop: 12 }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back-outline" size={18} color={THEME.text.secondary} style={styles.buttonIcon} />
            <Text style={styles.actionButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
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
          accessible={true}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={THEME.text.primary} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle} numberOfLines={1}>{subscription.name}</Text>
        
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={handleShareSubscription}
          accessible={true}
          accessibilityLabel="Share subscription"
          accessibilityRole="button"
        >
          <Ionicons name="share-outline" size={24} color={THEME.text.primary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.card}>
        <LinearGradient
          colors={['rgba(132, 63, 222, 0.08)', 'rgba(132, 63, 222, 0.04)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.costSection}
        >
          <View style={styles.costHeader}>
            <Text style={styles.costLabel}>Cost</Text>
            <View style={styles.frequencyBadge}>
              <Text style={styles.frequencyText}>{subscription.renewal_frequency}</Text>
            </View>
          </View>
          <Text style={styles.costValue}>{formatCurrency(subscription.cost)}</Text>
          {subscription.renewal_frequency !== 'yearly' && (
            <Text style={styles.annualCostText}>
              {formatCurrency(calculateAnnualCost(subscription))} per year
            </Text>
          )}
        </LinearGradient>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Category</Text>
          <Text style={styles.detailValue}>{subscription.category}</Text>
        </View>

        <View style={styles.dateContainer}>
          <View style={styles.dateColumn}>
            <Text style={styles.detailLabel}>Start Date</Text>
            <Text style={styles.dateValue}>{formatDate(subscription.start_date)}</Text>
          </View>
          <View style={styles.dateColumnRight}>
            <Text style={styles.detailLabelRight}>Next Renewal</Text>
            <Text style={styles.dateValueRight}>{formatDate(subscription.next_renewal_date)}</Text>
          </View>
        </View>

        <View style={styles.badgeContainer}>
          {subscription.auto_renews && (
            <View style={[styles.badge, { backgroundColor: 'rgba(132, 63, 222, 0.08)' }]}>
              <Ionicons name="checkmark-circle" size={14} color={THEME.primary} />
              <Text style={styles.badgeText}>Auto-Renews</Text>
            </View>
          )}
          {subscription.is_shared && (
            <View style={[styles.badge, { backgroundColor: 'rgba(66, 133, 244, 0.08)' }]}>
              <Ionicons name="people" size={14} color="#4285F4" />
              <Text style={[styles.badgeText, { color: "#4285F4" }]}>Shared</Text>
            </View>
          )}
          {subscription.is_shared && subscription.max_members && (
            <View style={[styles.badge, { backgroundColor: 'rgba(52, 168, 83, 0.08)' }]}>
              <Ionicons name="person" size={14} color="#34A853" />
              <Text style={[styles.badgeText, { color: "#34A853" }]}>{subscription.max_members} Members</Text>
            </View>
          )}
        </View>
      </View>

      {subscription.is_shared && (
        <View style={styles.membersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Members</Text>
            {isCurrentUserAdmin && (
              <TouchableOpacity 
                style={styles.inviteButton}
                onPress={() => setShowInviteModal(true)}
                accessible={true}
                accessibilityLabel="Invite members"
                accessibilityRole="button"
              >
                <Ionicons name="person-add" size={16} color={THEME.primary} />
                <Text style={styles.inviteButtonText}>Invite</Text>
              </TouchableOpacity>
            )}
          </View>
          {renderMembers()}
        </View>
      )}

      {isCurrentUserAdmin ? (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('EditSubscription', { subscriptionId })}
            accessible={true}
            accessibilityLabel="Edit subscription"
            accessibilityRole="button"
          >
            <View style={styles.buttonInner}>
              <Ionicons name="create-outline" size={22} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.editButtonText}>Edit</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => {
              console.log('Delete button pressed');
              showDeleteConfirmation();
            }}
            accessible={true}
            accessibilityLabel="Delete subscription"
            accessibilityRole="button"
            accessibilityHint="Permanently removes this subscription"
          >
            <View style={styles.buttonInner}>
              <Ionicons name="trash-outline" size={22} color="#E53935" style={styles.buttonIcon} />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.noAccessText}>
          Only the subscription admin can edit or delete this subscription.
        </Text>
      )}

      {!subscription.is_shared && isCurrentUserAdmin && (
        <View style={styles.convertContainer}>
          <TouchableOpacity
            style={styles.convertButton}
            onPress={handleConvertToShared}
            accessible={true}
            accessibilityLabel="Convert to shared subscription"
            accessibilityRole="button"
          >
            <View style={styles.buttonInner}>
              <Ionicons name="people-outline" size={22} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.convertButtonText}>Convert to Shared</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {renderDebugView()}
      {renderInviteModal()}
    </ScrollView>
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
    paddingTop: Platform.OS === 'ios' ? 68 : 36,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontFamily: fontStyles.semiBold,
    fontSize: 18,
    color: THEME.text.primary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  shareButton: {
    padding: 8,
  },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  costSection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  costHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  costLabel: {
    fontFamily: fontStyles.medium,
    fontSize: 16,
    color: THEME.primary,
  },
  costValue: {
    fontFamily: fontStyles.semiBold,
    fontSize: 32,
    color: THEME.text.primary,
    marginBottom: 4,
  },
  frequencyBadge: {
    backgroundColor: 'rgba(132, 63, 222, 0.15)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  frequencyText: {
    fontFamily: fontStyles.medium,
    fontSize: 14,
    color: THEME.primary,
  },
  annualCostText: {
    fontFamily: fontStyles.regular,
    fontSize: 14,
    color: THEME.text.secondary,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  dateColumn: {
    width: '48%',
  },
  dateColumnRight: {
    width: '48%',
    alignItems: 'flex-end',
  },
  detailLabel: {
    fontFamily: fontStyles.regular,
    fontSize: 15,
    color: THEME.text.secondary,
    marginBottom: 4,
  },
  detailLabelRight: {
    fontFamily: fontStyles.regular,
    fontSize: 15,
    color: THEME.text.secondary,
    marginBottom: 4,
    textAlign: 'right',
  },
  detailValue: {
    fontFamily: fontStyles.medium,
    fontSize: 16,
    color: THEME.text.primary,
  },
  dateValue: {
    fontFamily: fontStyles.medium,
    fontSize: 16,
    color: THEME.text.primary,
  },
  dateValueRight: {
    fontFamily: fontStyles.medium,
    fontSize: 16,
    color: THEME.text.primary,
    textAlign: 'right',
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 14,
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeText: {
    fontFamily: fontStyles.medium,
    fontSize: 14,
    color: THEME.primary,
    marginLeft: 6,
  },
  sectionTitle: {
    fontFamily: fontStyles.semiBold,
    fontSize: 18,
    color: THEME.text.primary,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptyText: {
    fontFamily: fontStyles.regular,
    fontSize: 14,
    color: THEME.text.tertiary,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginVertical: 16,
    gap: 12,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  editButton: {
    backgroundColor: '#7B3FD9', // Slightly desaturated purple
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E53935', // Slightly muted red
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  editButtonText: {
    fontFamily: fontStyles.medium,
    color: '#FFFFFF',
    fontSize: 15,
    marginLeft: 8,
  },
  deleteButtonText: {
    fontFamily: fontStyles.medium,
    color: '#E53935', // Matching border color
    fontSize: 15,
    marginLeft: 8,
  },
  convertContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  convertButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 16, // Matching the other buttons
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  convertButtonText: {
    fontFamily: fontStyles.semiBold,
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 8,
  },
  actionButton: {
    backgroundColor: THEME.background,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  actionButtonText: {
    fontFamily: fontStyles.medium,
    color: THEME.text.secondary,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.background,
    padding: 20,
  },
  loadingContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: fontStyles.medium,
    marginTop: 12,
    fontSize: 16,
    color: THEME.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.background,
    padding: 20,
  },
  errorContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIconContainer: {
    marginBottom: 16,
  },
  errorTitle: {
    fontFamily: fontStyles.semiBold,
    fontSize: 18,
    color: THEME.text.primary,
    marginBottom: 8,
  },
  errorText: {
    fontFamily: fontStyles.medium,
    fontSize: 16,
    color: THEME.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  membersSection: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  membersContainer: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  memberItemAlt: {
    backgroundColor: 'rgba(242, 243, 245, 0.5)',
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    position: 'relative',
  },
  adminAvatar: {
    backgroundColor: THEME.primary,
  },
  adminBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: THEME.primary,
    borderRadius: 6,
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  memberAvatarText: {
    fontFamily: fontStyles.semiBold,
    fontSize: 14,
    color: THEME.primary,
  },
  adminAvatarText: {
    color: '#FFFFFF',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontFamily: fontStyles.medium,
    fontSize: 15,
    color: THEME.text.primary,
    marginBottom: 2,
  },
  memberStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  memberStatus: {
    fontFamily: fontStyles.regular,
    fontSize: 13,
    color: THEME.text.tertiary,
  },
  adminStatus: {
    color: THEME.primary,
    fontFamily: fontStyles.medium,
  },
  noMembersText: {
    fontFamily: fontStyles.regular,
    fontSize: 14,
    color: THEME.text.tertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
  inviteButton: {
    backgroundColor: 'rgba(132, 63, 222, 0.08)', // Very light purple
    borderWidth: 1,
    borderColor: THEME.primary,
    borderRadius: 50,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteButtonText: {
    fontFamily: fontStyles.medium,
    color: THEME.primary,
    fontSize: 14,
    marginLeft: 6,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  modalTitle: {
    fontFamily: fontStyles.semiBold,
    fontSize: 20,
    color: THEME.text.primary,
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  modalInput: {
    fontFamily: fontStyles.regular,
    backgroundColor: THEME.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: THEME.text.primary,
    marginBottom: 16,
  },
  modalHelperText: {
    fontFamily: fontStyles.regular,
    fontSize: 12,
    color: THEME.text.tertiary,
    marginBottom: 24,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalCancelButton: {
    backgroundColor: THEME.background,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 12,
  },
  modalCancelButtonText: {
    fontFamily: fontStyles.medium,
    color: THEME.text.secondary,
    fontSize: 14,
  },
  modalSubmitButton: {
    backgroundColor: THEME.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  modalSubmitButtonText: {
    fontFamily: fontStyles.medium,
    color: '#FFFFFF',
    fontSize: 14,
  },
  debugContainer: {
    backgroundColor: THEME.card,
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  debugTitle: {
    fontFamily: fontStyles.semiBold,
    fontSize: 18,
    color: THEME.text.primary,
    marginBottom: 12,
  },
  debugText: {
    fontFamily: fontStyles.medium,
    fontSize: 14,
    color: THEME.text.secondary,
    marginBottom: 8,
  },
  debugUserText: {
    fontFamily: fontStyles.regular,
    fontSize: 12,
    color: THEME.text.tertiary,
    marginBottom: 4,
  },
  debugModalButton: {
    backgroundColor: THEME.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  debugButtonText: {
    fontFamily: fontStyles.medium,
    color: '#FFFFFF',
    fontSize: 14,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.primary,
    marginRight: 4,
  },
  statusText: {
    fontFamily: fontStyles.regular,
    fontSize: 14,
    color: THEME.text.primary,
  },
  emptyMembersContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: THEME.background,
    borderRadius: 12,
  },
  memberActionButton: {
    padding: 8,
  },
  noAccessText: {
    fontFamily: fontStyles.regular,
    fontSize: 14,
    color: THEME.text.tertiary,
    fontStyle: 'italic',
    marginHorizontal: 16,
    marginVertical: 12,
    textAlign: 'center',
  },
}); 