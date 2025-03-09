import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { Session, User } from '@supabase/supabase-js';

// Define the user profile type
export interface UserProfile {
  user_id: string;
  username: string | null;
  name: string | null;
  currency: string;
  theme: 'light' | 'dark' | 'system';
  created_at: string;
}

// Define the auth store state
interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  isFetchingProfile: boolean;
  
  // Auth methods
  signUp: (email: string, password: string, username: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  
  // Profile methods
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;

  // New method
  ensureProfileExists: () => Promise<void>;
}

// Create the auth store
export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: false,
  error: null,
  isFetchingProfile: false,

  // Ensure user profile exists
  ensureProfileExists: async () => {
    // First, get the current user directly from Supabase to ensure we have the latest data
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Error getting current user:', authError);
      set({ 
        error: authError.message, 
        loading: false 
      });
      return;
    }
    
    if (!authData || !authData.user) {
      console.log('No authenticated user found');
      set({ loading: false });
      return;
    }
    
    const currentUser = authData.user;
    console.log('Current authenticated user:', currentUser.id);
    console.log('User metadata:', currentUser.user_metadata);
    
    // Update the user in the store
    set({ user: currentUser });
    
    // Now check if the profile exists
    console.log('Checking if profile exists for user:', currentUser.id);
    set({ loading: true, error: null });
    
    try {
      // Check if profile exists
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned, profile doesn't exist
          console.log('No profile found for user:', currentUser.id);
        } else {
          console.error('Error checking if profile exists:', error);
          throw error;
        }
      }

      // If profile exists, update the state and return
      if (data) {
        console.log('Profile found:', data);
        
        // Check if the username is an email and needs to be updated
        const isEmailUsername = data.username && data.username.includes('@');
        const hasMetadataUsername = currentUser.user_metadata && currentUser.user_metadata.username;
        
        if (isEmailUsername && hasMetadataUsername) {
          console.log('Username is an email, updating to use metadata username:', currentUser.user_metadata.username);
          
          // Update the username to use the one from metadata
          const { data: updatedData, error: updateError } = await supabase
            .from('users')
            .update({ username: currentUser.user_metadata.username })
            .eq('user_id', currentUser.id)
            .select()
            .single();
            
          if (updateError) {
            console.error('Error updating username:', updateError);
          } else {
            console.log('Username updated successfully:', updatedData);
            set({ 
              profile: updatedData as UserProfile,
              loading: false 
            });
            return;
          }
        } else {
          set({ 
            profile: data as UserProfile,
            loading: false 
          });
          return;
        }
      }

      // If no profile exists, create one
      console.log('Creating new profile for user:', currentUser.id);
      
      // Get username from metadata if available, otherwise generate one
      let username = currentUser.user_metadata?.username;
      
      // If no username in metadata, use a default one (not email)
      if (!username) {
        // Generate a username based on the first part of the email or a random string
        username = currentUser.email 
          ? currentUser.email.split('@')[0] + '_' + Math.floor(Math.random() * 1000)
          : `user_${Math.floor(Math.random() * 10000)}`;
      }
      
      const { data: insertData, error: insertError } = await supabase
        .from('users')
        .insert([
          {
            user_id: currentUser.id,
            username: username,
            name: currentUser.user_metadata?.name || null,
            currency: 'USD',
            theme: 'light',
          },
        ])
        .select()
        .single();

      if (insertError) {
        console.error('Error creating profile:', insertError);
        throw insertError;
      }
      
      console.log('New profile created:', insertData);
      
      // Update the state with the newly created profile
      set({ 
        profile: insertData as UserProfile,
        loading: false 
      });
    } catch (error) {
      console.error('Error ensuring profile exists:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to ensure profile exists', 
        loading: false 
      });
    }
  },

  // Sign up a new user
  signUp: async (email, password, username) => {
    set({ loading: true, error: null });
    try {
      console.log('Signing up user with email:', email, 'and username:', username);
      
      // First, check if the username is already taken
      if (username) {
        const { data: existingUser, error: usernameError } = await supabase
          .from('users')
          .select('username')
          .eq('username', username)
          .single();
          
        if (existingUser) {
          set({ loading: false });
          return { 
            success: false, 
            error: 'Username is already taken. Please choose another one.' 
          };
        }
      }
      
      // Sign up the user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username // Store username in user metadata
          },
          emailRedirectTo: undefined // Disable email redirect
        }
      });

      if (error) throw error;

      // Create a user profile if signup was successful
      if (data.user) {
        console.log('User created successfully, creating profile for user:', data.user.id);
        
        // Set the session and user after successful registration
        set({ 
          session: data.session, 
          user: data.user,
          loading: false 
        });
        
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('users')
            .insert([
              {
                user_id: data.user.id,
                username: username, // Use the provided username
                name: null,
                currency: 'USD',
                theme: 'light',
              },
            ])
            .select()
            .single();

          if (profileError) {
            console.error('Error creating profile during signup:', profileError);
            // If there's an error creating the profile, we'll try again later with ensureProfileExists
            return { success: true };
          }
          
          console.log('Profile created successfully during signup:', profileData);
          
          // Set the profile in the state
          set({ profile: profileData as UserProfile });
          
          return { success: true };
        } catch (profileError) {
          console.error('Error creating profile during signup:', profileError);
          // Even if profile creation fails, we still return success for the signup
          // The profile will be created later when ensureProfileExists is called
          return { success: true };
        }
      }

      set({ loading: false });
      return { success: true };
    } catch (error) {
      console.error('Error signing up:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to sign up', 
        loading: false 
      });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to sign up' 
      };
    }
  },

  // Sign in an existing user
  signIn: async (email, password) => {
    set({ loading: true, error: null });
    try {
      console.log('Signing in user with email:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      console.log('User signed in successfully:', data.user?.id);
      set({ 
        session: data.session, 
        user: data.user,
        loading: false 
      });

      // Fetch the user profile after successful login
      try {
        console.log('Fetching profile after login for user:', data.user?.id);
        await get().fetchProfile();
        
        // If profile is not found, ensure it exists
        const { profile } = get();
        if (!profile && data.user) {
          console.log('Profile not found after login, ensuring it exists...');
          await get().ensureProfileExists();
        }
      } catch (profileError) {
        console.error('Error fetching profile after login:', profileError);
        // Continue anyway, as the user is signed in
      }

      return { success: true };
    } catch (error) {
      console.error('Error signing in:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to sign in', 
        loading: false 
      });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to sign in' 
      };
    }
  },

  // Sign out the current user
  signOut: async () => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      set({ 
        session: null, 
        user: null, 
        profile: null,
        loading: false 
      });
    } catch (error) {
      console.error('Error signing out:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to sign out', 
        loading: false 
      });
    }
  },

  // Reset password for a user
  resetPassword: async (email) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'klypp://reset-password',
      });

      if (error) throw error;

      set({ loading: false });
      return { success: true };
    } catch (error) {
      console.error('Error resetting password:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to reset password', 
        loading: false 
      });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to reset password' 
      };
    }
  },

  // Fetch the user profile
  fetchProfile: async () => {
    // Prevent multiple rapid calls
    if (get().isFetchingProfile) {
      console.log('Profile fetch already in progress, skipping duplicate call');
      return;
    }
    
    set({ isFetchingProfile: true });
    
    // First, get the current user directly from Supabase to ensure we have the latest data
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Error getting current user in fetchProfile:', authError);
      set({ 
        error: authError.message, 
        loading: false,
        isFetchingProfile: false
      });
      return;
    }
    
    if (!authData || !authData.user) {
      console.log('No authenticated user found in fetchProfile');
      set({ loading: false, isFetchingProfile: false });
      return;
    }
    
    const currentUser = authData.user;
    console.log('Current authenticated user in fetchProfile:', currentUser.id);
    
    // Update the user in the store
    set({ user: currentUser, loading: true, error: null });

    try {
      console.log('Querying users table for user_id:', currentUser.id);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

      if (error) {
        // Check if the error is about missing table
        if (error.code === '42P01') {
          console.warn('Users table does not exist yet. This is expected in development.');
          set({ 
            profile: null,
            loading: false,
            isFetchingProfile: false,
            error: 'Database tables not set up yet. Please set up your Supabase tables.'
          });
          return;
        }
        
        // Check if the error is about no rows returned
        if (error.code === 'PGRST116') {
          console.log('No profile found for user:', currentUser.id);
          set({ profile: null, loading: false, isFetchingProfile: false });
          return;
        }
        
        throw error;
      }

      console.log('Profile data fetched:', data);
      set({ 
        profile: data as UserProfile,
        loading: false,
        isFetchingProfile: false
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch profile', 
        loading: false,
        isFetchingProfile: false
      });
    }
  },

  // Update the user profile
  updateProfile: async (updates) => {
    const { user } = get();
    if (!user) return;

    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update the local state
      set(state => ({
        profile: state.profile ? { ...state.profile, ...updates } : null,
        loading: false
      }));
    } catch (error) {
      console.error('Error updating profile:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update profile', 
        loading: false 
      });
    }
  },
})); 