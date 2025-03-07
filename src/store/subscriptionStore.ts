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
  deleteSubscription: (subscriptionId: string) => Promise<void>;
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
      const { data: memberSubscriptions, error: memberError } = await supabase
        .from('subscription_members')
        .select(`
          subscription_id,
          status,
          subscriptions:subscription_id (*)
        `)
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
        throw memberError;
      }

      // Process member subscriptions to extract the subscription data
      const sharedSubscriptions = memberSubscriptions
        ? memberSubscriptions
            .filter(item => item.subscriptions) // Filter out any null subscriptions
            .map(item => item.subscriptions as unknown as Subscription)
        : [];

      // Combine owned and shared subscriptions
      const allSubscriptions = [
        ...(ownedSubscriptions || []),
        ...sharedSubscriptions
      ];

      // Remove duplicates (in case user is both admin and member)
      const uniqueSubscriptions = Array.from(
        new Map(allSubscriptions.map(sub => [sub.subscription_id, sub])).values()
      );

      set({ 
        subscriptions: uniqueSubscriptions,
        loading: false 
      });
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch subscriptions', 
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
    set({ loading: true, error: null });
    try {
      // Delete the subscription from the database
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('subscription_id', subscriptionId);

      if (error) throw error;

      // Update the local state
      set(state => ({
        subscriptions: state.subscriptions.filter(sub => sub.subscription_id !== subscriptionId),
        loading: false
      }));
    } catch (error) {
      console.error('Error deleting subscription:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete subscription', 
        loading: false 
      });
    }
  },

  // Get a subscription by ID
  getSubscriptionById: (subscriptionId) => {
    return get().subscriptions.find(sub => sub.subscription_id === subscriptionId);
  }
})); 