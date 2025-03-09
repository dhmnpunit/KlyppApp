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
      
      // Always use the RPC function to bypass RLS policies
      console.log('Using RPC function to invite user by username');
      const { data: inviteData, error: inviteError } = await supabase.rpc(
        'invite_user_by_username',
        { 
          p_subscription_id: subscriptionId,
          p_username: cleanUsername
        }
      );
      
      if (inviteError) {
        console.error('Error in invitation:', inviteError);
        return { 
          success: false, 
          error: `Could not invite user "${cleanUsername}". The username may not exist or you don't have permission.` 
        };
      }
      
      console.log('Invitation successful:', inviteData);
      return { 
        success: true, 
        data: inviteData 
      };
    } catch (error) {
      console.error('Unexpected error in invitation process:', error);
      return {
        success: false,
        error: 'An unexpected error occurred during the invitation process.'
      };
    }
  },

  /**
   * Get all members of a subscription, including the admin
   * @param subscriptionId - The ID of the subscription
   * @returns A promise that resolves to the members of the subscription
   */
  getSubscriptionMembers: async (subscriptionId: string) => {
    try {
      console.log('Getting members for subscription:', subscriptionId);
      
      // First, get the subscription details to get the admin_id
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('admin_id')
        .eq('subscription_id', subscriptionId)
        .single();
        
      if (subscriptionError) {
        console.error('Error getting subscription details:', subscriptionError);
        return { 
          success: false, 
          error: subscriptionError.message || 'Failed to get subscription details' 
        };
      }
      
      const adminId = subscriptionData?.admin_id;
      console.log('Admin ID for subscription:', adminId);
      
      // Get the subscription members
      const { data: membersData, error: membersError } = await supabase
        .from('subscription_members')
        .select('user_id, status, joined_at')
        .eq('subscription_id', subscriptionId);

      if (membersError) {
        console.error('Error getting subscription members:', membersError);
        return { 
          success: false, 
          error: membersError.message || 'Failed to get subscription members' 
        };
      }

      console.log('Subscription members found:', membersData?.length || 0);
      
      // Prepare the array to hold all members including the admin
      let allMembers = membersData || [];
      
      // Then, for each member, get the user details
      const membersWithUserDetails = await Promise.all(
        allMembers.map(async (member) => {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('username, name')
            .eq('user_id', member.user_id)
            .single();
          
          if (userError) {
            console.warn(`Could not fetch user details for ${member.user_id}:`, userError);
            return { 
              ...member, 
              users: null 
            };
          }
          
          // Return in the same format as the original join would have
          return { 
            ...member, 
            users: userData 
          };
        })
      );
      
      // Get admin details if admin ID is available
      let adminDetails = null;
      if (adminId) {
        const { data: adminUserData, error: adminUserError } = await supabase
          .from('users')
          .select('username, name')
          .eq('user_id', adminId)
          .single();
          
        if (adminUserError) {
          console.warn(`Could not fetch admin details for ${adminId}:`, adminUserError);
        } else {
          // Create an admin member object
          adminDetails = {
            user_id: adminId,
            status: 'admin', // Special status for admin
            joined_at: null, // Admin doesn't have a joined_at date
            users: adminUserData,
            isAdmin: true // Flag to identify admin
          };
        }
      }
      
      // Add admin to the members list if found
      const finalMembersList = adminDetails 
        ? [adminDetails, ...membersWithUserDetails] 
        : membersWithUserDetails;
      
      console.log('Final members list with admin:', finalMembersList.length);
      
      return { 
        success: true, 
        data: finalMembersList 
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
        // Update the member status and set joined_at to current time
        const { data, error } = await supabase
          .from('subscription_members')
          .update({
            status: 'accepted',
            joined_at: new Date().toISOString(),
          })
          .eq('subscription_id', subscriptionId)
          .eq('user_id', userId)
          .select();

        if (error) {
          console.error('Error accepting invitation:', error);
          return { 
            success: false, 
            error: error.message || 'Failed to accept invitation' 
          };
        }

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
}; 