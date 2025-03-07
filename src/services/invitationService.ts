import { supabase } from './supabase';

/**
 * Service for handling subscription invitations
 */
export const invitationService = {
  /**
   * Invite a user to a subscription by username
   * @param subscriptionId - The ID of the subscription
   * @param username - The username of the user to invite
   * @returns A promise that resolves to the invitation result
   */
  inviteUserByUsername: async (subscriptionId: string, username: string) => {
    try {
      const cleanUsername = username.trim();
      console.log('Starting invitation process for user:', cleanUsername, 'to subscription:', subscriptionId);
      
      // First, try to find the user with exact match
      console.log('Finding user by username (exact match):', cleanUsername);
      let { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, username')
        .eq('username', cleanUsername);

      // If no exact match, try case-insensitive search
      if (!usersError && (!usersData || usersData.length === 0)) {
        console.log('No exact match found, trying case-insensitive search');
        const { data: caseInsensitiveData, error: caseInsensitiveError } = await supabase
          .from('users')
          .select('user_id, username')
          .ilike('username', cleanUsername);
          
        if (!caseInsensitiveError) {
          usersData = caseInsensitiveData;
        } else {
          console.error('Error in case-insensitive search:', caseInsensitiveError);
        }
      }

      // If we still can't find the user, try a direct approach
      // This is a workaround for RLS policies that might prevent seeing other users
      if (!usersError && (!usersData || usersData.length === 0)) {
        console.log('No users found, trying direct invitation by username');
        
        // Create a function to directly invite by username
        // This will be executed on the server side where RLS doesn't apply
        const { data: directInviteData, error: directInviteError } = await supabase.rpc(
          'invite_user_by_username',
          { 
            p_subscription_id: subscriptionId,
            p_username: cleanUsername
          }
        );
        
        if (directInviteError) {
          console.error('Error in direct invitation:', directInviteError);
          return { 
            success: false, 
            error: `Could not invite user "${cleanUsername}". The username may not exist or you don't have permission.` 
          };
        }
        
        if (directInviteData) {
          console.log('Direct invitation successful:', directInviteData);
          return { 
            success: true, 
            data: directInviteData 
          };
        }
      }

      // Log all users in the database to help debug
      console.log('Debugging - Fetching all users from database');
      const { data: allUsers } = await supabase
        .from('users')
        .select('user_id, username');
      console.log('All users in database:', allUsers);

      if (usersError) {
        console.error('Error finding user by username:', usersError);
        return { 
          success: false, 
          error: usersError.message || 'Error finding user' 
        };
      }

      // Check if we found any users
      if (!usersData || usersData.length === 0) {
        console.log('No user found with username:', cleanUsername);
        return { 
          success: false, 
          error: `User "${cleanUsername}" not found. Please check the username and try again.` 
        };
      }
      
      if (usersData.length > 1) {
        console.log('Multiple users found with similar username:', usersData);
        return { 
          success: false, 
          error: 'Multiple users found with this username. Please use the exact username.' 
        };
      }
      
      // We found exactly one user
      const userData = usersData[0];
      console.log('User found:', userData);
      const userId = userData.user_id;

      // Check if the user is already a member of the subscription
      console.log('Checking if user is already a member of subscription:', subscriptionId);
      const { data: existingMember, error: memberError } = await supabase
        .from('subscription_members')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .eq('user_id', userId)
        .maybeSingle();

      if (memberError && memberError.code !== 'PGRST116') {
        console.error('Error checking existing membership:', memberError);
        return { 
          success: false, 
          error: memberError.message || 'Failed to check membership' 
        };
      }

      if (existingMember) {
        console.log('User is already a member of this subscription:', existingMember);
        return { 
          success: false, 
          error: 'User is already a member of this subscription' 
        };
      }

      // Add the user to the subscription_members table with status 'pending'
      console.log('Adding user to subscription_members with status pending');
      const { data: memberData, error: insertError } = await supabase
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
        console.error('Error inviting user to subscription:', insertError);
        return { 
          success: false, 
          error: insertError.message || 'Failed to invite user' 
        };
      }

      console.log('User added to subscription_members:', memberData);

      // Create a notification for the invited user
      console.log('Getting subscription details for notification');
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('name, admin_id')
        .eq('subscription_id', subscriptionId)
        .single();

      if (subscriptionError) {
        console.error('Error getting subscription details:', subscriptionError);
        // Continue anyway, as the member has been added
      }

      if (subscriptionData) {
        console.log('Creating notification for user:', userId);
        // Use the RPC function instead of direct table insert
        const { data: notificationData, error: notificationError } = await supabase.rpc(
          'create_invitation_notification',
          {
            p_user_id: userId,
            p_subscription_id: subscriptionId,
            p_message: `You have been invited to join the ${subscriptionData.name} subscription`
          }
        );

        if (notificationError) {
          console.error('Error creating notification:', notificationError);
          // Continue anyway, as the member has been added
        } else {
          console.log('Notification created successfully using RPC function');
        }
      }

      console.log('Invitation process completed successfully');
      return { 
        success: true, 
        data: memberData 
      };
    } catch (error) {
      console.error('Error in inviteUserByUsername:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      };
    }
  },

  /**
   * Get all members of a subscription
   * @param subscriptionId - The ID of the subscription
   * @returns A promise that resolves to the members of the subscription
   */
  getSubscriptionMembers: async (subscriptionId: string) => {
    try {
      console.log('Getting members for subscription:', subscriptionId);
      
      // Use the RPC function instead of direct table query
      const { data, error } = await supabase.rpc(
        'get_subscription_members',
        {
          p_subscription_id: subscriptionId
        }
      );

      if (error) {
        console.error('Error getting subscription members:', error);
        return { 
          success: false, 
          error: error.message || 'Failed to get subscription members' 
        };
      }

      // The RPC function returns a JSON object with success and data properties
      if (data && data.success) {
        console.log('Subscription members found:', data.data?.length || 0);
        console.log('Members data:', data.data);
        
        return { 
          success: true, 
          data: data.data 
        };
      } else if (data && !data.success) {
        console.error('RPC function returned error:', data.error);
        return {
          success: false,
          error: data.error || 'Failed to get subscription members'
        };
      }
      
      return { 
        success: false, 
        error: 'Unexpected response format from RPC function' 
      };
    } catch (error) {
      console.error('Error in getSubscriptionMembers:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      };
    }
  },

  /**
   * Accept or reject an invitation
   * @param subscriptionId - The ID of the subscription
   * @param userId - The ID of the user
   * @param status - The new status ('accepted' or 'rejected')
   * @returns A promise that resolves to the result of the operation
   */
  updateInvitationStatus: async (subscriptionId: string, userId: string, status: 'accepted' | 'rejected') => {
    try {
      if (status === 'accepted') {
        // Use the RPC function instead of direct table update
        console.log('Using RPC function to accept invitation:', subscriptionId, userId);
        const { data, error } = await supabase.rpc(
          'accept_subscription_invitation',
          {
            p_subscription_id: subscriptionId,
            p_user_id: userId
          }
        );

        if (error) {
          console.error('Error accepting invitation with RPC:', error);
          return { 
            success: false, 
            error: error.message || 'Failed to accept invitation' 
          };
        }

        console.log('Invitation accepted successfully with RPC:', data);
        return { 
          success: true, 
          data 
        };
      } else {
        // Remove the member from the subscription
        const { error } = await supabase
          .from('subscription_members')
          .delete()
          .eq('subscription_id', subscriptionId)
          .eq('user_id', userId);

        if (error) {
          console.error('Error rejecting invitation:', error);
          return { 
            success: false, 
            error: error.message || 'Failed to reject invitation' 
          };
        }

        return { 
          success: true 
        };
      }
    } catch (error) {
      console.error('Error in updateInvitationStatus:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      };
    }
  },

  /**
   * Remove a member from a subscription (admin only)
   * @param subscriptionId - The ID of the subscription
   * @param userId - The ID of the user to remove
   * @returns A promise that resolves to the result of the operation
   */
  removeMember: async (subscriptionId: string, userId: string) => {
    try {
      // First, check if the subscription exists and the current user is the admin
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { 
          success: false, 
          error: 'User not authenticated' 
        };
      }
      
      // Get the subscription to check if the current user is the admin
      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('admin_id')
        .eq('subscription_id', subscriptionId)
        .single();
        
      if (subscriptionError) {
        console.error('Error getting subscription:', subscriptionError);
        return { 
          success: false, 
          error: subscriptionError.message || 'Failed to get subscription' 
        };
      }
      
      // Check if the current user is the admin
      if (subscription.admin_id !== user.id) {
        return { 
          success: false, 
          error: 'Only the subscription admin can remove members' 
        };
      }
      
      // Remove the member from the subscription
      const { error } = await supabase
        .from('subscription_members')
        .delete()
        .eq('subscription_id', subscriptionId)
        .eq('user_id', userId);
        
      if (error) {
        console.error('Error removing member:', error);
        return { 
          success: false, 
          error: error.message || 'Failed to remove member' 
        };
      }
      
      // Create a notification for the removed user
      const { data: notificationData, error: notificationError } = await supabase
        .from('notifications')
        .insert([
          {
            user_id: userId,
            subscription_id: subscriptionId,
            message: `You have been removed from the subscription`,
            type: 'info',
            status: 'unread',
          },
        ])
        .select();
        
      if (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Continue anyway as the member has been removed
      }
      
      return { 
        success: true 
      };
    } catch (error) {
      console.error('Error in removeMember:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      };
    }
  },

  /**
   * Leave a subscription (for members)
   * @param subscriptionId - The ID of the subscription
   * @returns A promise that resolves to the result of the operation
   */
  leaveSubscription: async (subscriptionId: string) => {
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { 
          success: false, 
          error: 'User not authenticated' 
        };
      }
      
      // Check if the user is the admin of the subscription
      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('admin_id')
        .eq('subscription_id', subscriptionId)
        .single();
        
      if (subscriptionError) {
        console.error('Error getting subscription:', subscriptionError);
        return { 
          success: false, 
          error: subscriptionError.message || 'Failed to get subscription' 
        };
      }
      
      // If the user is the admin, they can't leave the subscription
      if (subscription.admin_id === user.id) {
        return { 
          success: false, 
          error: 'Subscription admins cannot leave. You must delete the subscription or transfer ownership.' 
        };
      }
      
      // Remove the user from the subscription
      const { error } = await supabase
        .from('subscription_members')
        .delete()
        .eq('subscription_id', subscriptionId)
        .eq('user_id', user.id);
        
      if (error) {
        console.error('Error leaving subscription:', error);
        return { 
          success: false, 
          error: error.message || 'Failed to leave subscription' 
        };
      }
      
      return { 
        success: true 
      };
    } catch (error) {
      console.error('Error in leaveSubscription:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      };
    }
  },
}; 