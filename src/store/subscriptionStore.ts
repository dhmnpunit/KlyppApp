import { create } from 'zustand';
import { supabase } from '../services/supabase';

// Define the subscription type
export interface Subscription {
  subscription_id: string;
  admin_id: string;
  name: string;
  cost: number;
  renewal_frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  start_date: string;
  next_renewal_date: string;
  category: string;
  auto_renews: boolean;
  is_shared: boolean;
  max_members?: number;
  created_at: string;
  updated_at: string;
}

// Define the subscription store state
interface SubscriptionState {
  subscriptions: Subscription[];
  loading: boolean;
  error: string | null;
  fetchSubscriptions: () => Promise<void>;
  addSubscription: (subscription: Omit<Subscription, 'subscription_id' | 'admin_id' | 'created_at' | 'updated_at'>) => Promise<Subscription | null>;
  updateSubscription: (subscriptionId: string, updates: Partial<Subscription>) => Promise<void>;
  deleteSubscription: (subscriptionId: string) => Promise<{ success: boolean; error?: unknown }>;
  getSubscriptionById: (subscriptionId: string) => Subscription | undefined;
}

// Create the subscription store
export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  subscriptions: [],
  loading: false,
  error: null,

  // Fetch all subscriptions for the current user
  fetchSubscriptions: async () => {
    set({ loading: true, error: null });
    try {
      console.log('Fetching subscriptions...');
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        set({ loading: false, error: 'User not authenticated' });
        return;
      }

      // Fetch subscriptions where the user is the admin
      const { data: ownedSubscriptions, error: ownedError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('admin_id', user.id);

      if (ownedError) {
        // Check if the error is about missing table
        if (ownedError.code === '42P01') {
          console.warn('Subscriptions table does not exist yet. This is expected in development.');
          set({ 
            subscriptions: [],
            loading: false,
            error: 'Database tables not set up yet. Please set up your Supabase tables.'
          });
          return;
        }
        throw ownedError;
      }

      // Fetch subscriptions where the user is a member (not admin)
      const { data: membershipData, error: memberError } = await supabase
        .from('subscription_members')
        .select('subscription_id, status')
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (memberError) {
        // Check if the error is about missing table
        if (memberError.code === '42P01') {
          console.warn('Subscription_members table does not exist yet. This is expected in development.');
          // Continue with just the owned subscriptions
          set({ 
            subscriptions: ownedSubscriptions || [],
            loading: false 
          });
          return;
        }
        console.error('Error fetching member subscriptions:', memberError);
        set({ error: memberError.message, loading: false });
        return;
      }

      // If no memberships, just use owned subscriptions
      if (!membershipData || membershipData.length === 0) {
        console.log('No shared subscriptions found, using only owned subscriptions');
        set({ 
          subscriptions: ownedSubscriptions || [],
          loading: false 
        });
        return;
      }

      console.log(`Found ${membershipData.length} shared subscriptions`);
      
      // Fetch the actual subscription details for each membership
      const memberSubscriptionsPromises = membershipData.map(async (membership) => {
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('subscription_id', membership.subscription_id)
          .single();
        
        if (subscriptionError) {
          console.error(`Error fetching shared subscription ${membership.subscription_id}:`, subscriptionError);
          return null;
        }
        
        return subscriptionData;
      });

      // Wait for all promises to resolve
      const memberSubscriptionsResults = await Promise.all(memberSubscriptionsPromises);
      
      // Filter out null results (failed fetches)
      const memberSubscriptions = memberSubscriptionsResults.filter(sub => sub !== null) as Subscription[];
      
      console.log(`Successfully fetched ${memberSubscriptions.length} shared subscriptions`);
      
      // Combine owned and member subscriptions
      const allSubscriptions = [...(ownedSubscriptions || []), ...memberSubscriptions];
      
      console.log(`Total subscriptions: ${allSubscriptions.length}`);
      
      // Set the subscriptions in the store
      set({ 
        subscriptions: allSubscriptions,
        loading: false 
      });
    } catch (error) {
      console.error('Error in fetchSubscriptions:', error);
      set({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        loading: false 
      });
    }
  },

  // Add a new subscription
  addSubscription: async (subscription) => {
    set({ loading: true, error: null });
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        set({ loading: false, error: 'User not authenticated' });
        return null;
      }

      // Add the subscription to the database
      const { data, error } = await supabase
        .from('subscriptions')
        .insert([
          { 
            ...subscription,
            admin_id: user.id,
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Update the local state
      set(state => ({
        subscriptions: [...state.subscriptions, data as Subscription],
        loading: false
      }));

      return data as Subscription;
    } catch (error) {
      console.error('Error adding subscription:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add subscription', 
        loading: false 
      });
      return null;
    }
  },

  // Update an existing subscription
  updateSubscription: async (subscriptionId, updates) => {
    set({ loading: true, error: null });
    try {
      // Update the subscription in the database
      const { error } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('subscription_id', subscriptionId);

      if (error) throw error;

      // Update the local state
      set(state => ({
        subscriptions: state.subscriptions.map(sub => 
          sub.subscription_id === subscriptionId ? { ...sub, ...updates } : sub
        ),
        loading: false
      }));
    } catch (error) {
      console.error('Error updating subscription:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update subscription', 
        loading: false 
      });
    }
  },

  // Delete a subscription
  deleteSubscription: async (subscriptionId) => {
    console.log('deleteSubscription called with ID:', subscriptionId);
    
    try {
      // Set loading state using setTimeout to avoid React warning
      setTimeout(() => {
        set({ loading: true, error: null });
      }, 0);
      
      // Step 1: Check if the subscription exists and get its details
      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .single();
        
      if (subscriptionError) {
        console.error('Error fetching subscription:', subscriptionError);
        setTimeout(() => {
          set({ error: 'Failed to fetch subscription details', loading: false });
        }, 0);
        return { success: false, error: subscriptionError };
      }
      
      if (!subscription) {
        console.error('Subscription not found');
        setTimeout(() => {
          set({ error: 'Subscription not found', loading: false });
        }, 0);
        return { success: false, error: 'Subscription not found' };
      }
      
      console.log('Found subscription:', subscription);
      
      // Step 2: Get all subscription members for debugging
      const { data: members, error: membersError } = await supabase
        .from('subscription_members')
        .select('*')
        .eq('subscription_id', subscriptionId);
        
      if (membersError) {
        console.error('Error fetching members:', membersError);
      } else {
        console.log('Found members:', members);
      }
      
      // Step 3: Try to delete subscription members directly with SQL
      try {
        console.log('Attempting to delete subscription members with RPC function');
        const { data: rpcResult, error: rpcError } = await supabase.rpc(
          'delete_subscription_with_related',
          { p_subscription_id: subscriptionId }
        );
        
        if (rpcError) {
          console.error('RPC error:', rpcError);
          // Continue with manual deletion
        } else {
          console.log('RPC result:', rpcResult);
          // If RPC was successful, update state and return
          setTimeout(() => {
            set(state => ({
              subscriptions: state.subscriptions.filter(sub => sub.subscription_id !== subscriptionId),
              loading: false
            }));
          }, 0);
          return { success: true };
        }
      } catch (rpcCatchError) {
        console.error('Error in RPC call:', rpcCatchError);
        // Continue with manual deletion
      }
      
      // Step 4: Manual deletion as fallback
      console.log('Falling back to manual deletion');
      
      // Step 4.1: Delete notifications first
      console.log('Deleting notifications');
      const { error: notificationsError } = await supabase
        .from('notifications')
        .delete()
        .eq('subscription_id', subscriptionId);
        
      if (notificationsError) {
        console.error('Error deleting notifications:', notificationsError);
        // Continue anyway
      }
      
      // Step 4.2: Try to delete subscription members one by one
      if (members && members.length > 0) {
        console.log('Deleting members one by one');
        
        for (const member of members) {
          console.log('Deleting member:', member);
          
          // Try with match
          const { error: deleteError1 } = await supabase
            .from('subscription_members')
            .delete()
            .match({ 
              subscription_id: subscriptionId, 
              user_id: member.user_id 
            });
            
          if (deleteError1) {
            console.error('Error deleting member with match:', deleteError1);
            
            // Try with eq
            const { error: deleteError2 } = await supabase
              .from('subscription_members')
              .delete()
              .eq('subscription_id', subscriptionId)
              .eq('user_id', member.user_id);
              
            if (deleteError2) {
              console.error('Error deleting member with eq:', deleteError2);
            } else {
              console.log('Successfully deleted member with eq');
            }
          } else {
            console.log('Successfully deleted member with match');
          }
        }
      }
      
      // Step 4.3: Check if any members remain
      const { data: remainingMembers, error: checkError } = await supabase
        .from('subscription_members')
        .select('*')
        .eq('subscription_id', subscriptionId);
        
      if (checkError) {
        console.error('Error checking remaining members:', checkError);
      } else if (remainingMembers && remainingMembers.length > 0) {
        console.error('Failed to delete all members:', remainingMembers);
        setTimeout(() => {
          set({ error: 'Failed to delete all subscription members', loading: false });
        }, 0);
        return { success: false, error: 'Failed to delete all subscription members' };
      }
      
      // Step 4.4: Finally delete the subscription
      console.log('Deleting subscription');
      const { error: deleteError } = await supabase
        .from('subscriptions')
        .delete()
        .eq('subscription_id', subscriptionId);

      if (deleteError) {
        console.error('Error deleting subscription:', deleteError);
        setTimeout(() => {
          set({ error: 'Failed to delete subscription', loading: false });
        }, 0);
        return { success: false, error: deleteError };
      }
      
      // Step 5: Update local state
      console.log('Successfully deleted subscription');
      setTimeout(() => {
      set(state => ({
        subscriptions: state.subscriptions.filter(sub => sub.subscription_id !== subscriptionId),
        loading: false
      }));
      }, 0);
      
      return { success: true };
    } catch (error) {
      console.error('Unexpected error in deleteSubscription:', error);
      setTimeout(() => {
      set({ 
          error: error instanceof Error ? error.message : 'An unexpected error occurred', 
        loading: false 
      });
      }, 0);
      return { success: false, error };
    }
  },

  // Get a subscription by ID
  getSubscriptionById: (subscriptionId) => {
    return get().subscriptions.find(sub => sub.subscription_id === subscriptionId);
  }
})); 