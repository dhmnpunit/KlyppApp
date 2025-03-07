# Klypp App - Row Level Security (RLS) Policies

This document outlines the Row Level Security (RLS) policies implemented in the Klypp app's Supabase database. These policies control access to data based on the authenticated user.

## Table of Contents
- [Overview](#overview)
- [Users Table](#users-table)
- [Subscriptions Table](#subscriptions-table)
- [Subscription Members Table](#subscription-members-table)
- [Notifications Table](#notifications-table)
- [Troubleshooting](#troubleshooting)

## Overview

Row Level Security (RLS) is a security feature in PostgreSQL that allows us to restrict which rows users can access in a table. In Klypp, we use RLS to ensure users can only access their own data and data that has been explicitly shared with them.

### Key Principles

1. Users should only see their own data or data shared with them
2. Subscription admins have full control over their subscriptions
3. Members can view shared subscriptions but cannot modify them
4. Notifications are only visible to their recipients

## Users Table

### SELECT Policy
```sql
CREATE POLICY "users_select" ON public.users
    FOR SELECT USING (true);
```
- **Purpose**: Allow all authenticated users to view basic user information
- **Effect**: Enables user search and profile viewing

### UPDATE Policy
```sql
CREATE POLICY "users_update" ON public.users
    FOR UPDATE USING (auth.uid() = user_id);
```
- **Purpose**: Allow users to update only their own profile
- **Effect**: Users can edit their profile details but not others'

## Subscriptions Table

### SELECT Policies
```sql
CREATE POLICY "subscriptions_select" ON public.subscriptions
    FOR SELECT USING (
        admin_id = auth.uid() OR
        subscription_id IN (
            SELECT subscription_id 
            FROM subscription_members 
            WHERE user_id = auth.uid() 
            AND status = 'accepted'
        )
    );
```
- **Purpose**: Allow users to view subscriptions they own or are members of
- **Effect**: Users see their own subscriptions and shared subscriptions they've accepted

### INSERT Policy
```sql
CREATE POLICY "subscriptions_insert" ON public.subscriptions
    FOR INSERT WITH CHECK (admin_id = auth.uid());
```
- **Purpose**: Allow users to create subscriptions only as the admin
- **Effect**: New subscriptions must be owned by the creating user

### UPDATE Policy
```sql
CREATE POLICY "subscriptions_update" ON public.subscriptions
    FOR UPDATE USING (admin_id = auth.uid());
```
- **Purpose**: Allow only subscription admins to update subscription details
- **Effect**: Only the owner can modify subscription properties

### DELETE Policy
```sql
CREATE POLICY "subscriptions_delete" ON public.subscriptions
    FOR DELETE USING (admin_id = auth.uid());
```
- **Purpose**: Allow only subscription admins to delete subscriptions
- **Effect**: Only the owner can delete a subscription

## Subscription Members Table

### SELECT Policy
```sql
CREATE POLICY "subscription_members_select" ON public.subscription_members
    FOR SELECT USING (
        user_id = auth.uid() OR
        subscription_id IN (
            SELECT subscription_id 
            FROM subscriptions 
            WHERE admin_id = auth.uid()
        )
    );
```
- **Purpose**: Allow users to view their own memberships and all members of subscriptions they admin
- **Effect**: Users can see who is in subscriptions they own and their own membership status

### INSERT Policy
```sql
CREATE POLICY "subscription_members_insert" ON public.subscription_members
    FOR INSERT WITH CHECK (
        subscription_id IN (
            SELECT subscription_id 
            FROM subscriptions 
            WHERE admin_id = auth.uid()
        )
    );
```
- **Purpose**: Allow subscription admins to add members
- **Effect**: Only subscription owners can invite others

### UPDATE Policy
```sql
CREATE POLICY "subscription_members_update" ON public.subscription_members
    FOR UPDATE USING (
        user_id = auth.uid() OR
        subscription_id IN (
            SELECT subscription_id 
            FROM subscriptions 
            WHERE admin_id = auth.uid()
        )
    );
```
- **Purpose**: Allow users to update their own membership status or admins to update any member
- **Effect**: Users can accept/reject invitations, admins can manage all members

### DELETE Policy
```sql
CREATE POLICY "subscription_members_delete" ON public.subscription_members
    FOR DELETE USING (
        user_id = auth.uid() OR
        subscription_id IN (
            SELECT subscription_id 
            FROM subscriptions 
            WHERE admin_id = auth.uid()
        )
    );
```
- **Purpose**: Allow users to leave subscriptions or admins to remove members
- **Effect**: Users can leave shared subscriptions, admins can remove any member

## Notifications Table

### SELECT Policy
```sql
CREATE POLICY "notifications_select" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());
```
- **Purpose**: Allow users to view only their own notifications
- **Effect**: Users only see notifications addressed to them

### UPDATE Policy
```sql
CREATE POLICY "notifications_update" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());
```
- **Purpose**: Allow users to update only their own notifications (e.g., mark as read)
- **Effect**: Users can only modify their own notification status

## Troubleshooting

### Common Issues

1. **Infinite Recursion**: If you encounter an error like `infinite recursion detected in policy for relation "subscriptions"`, it indicates circular dependencies between policies.

   **Solution**: Simplify policies to avoid circular references between tables.

2. **Missing Access**: If users cannot see shared subscriptions after accepting invitations:

   **Solution**: Verify the SELECT policy on subscriptions includes accepted members.

3. **Permission Denied**: If users cannot perform expected actions:

   **Solution**: Check that the appropriate policies exist and that the conditions match the intended access pattern.

### Testing RLS Policies

To test if RLS policies are working correctly:

1. Sign in as different users
2. Attempt to view, create, update, and delete resources
3. Verify that users can only access data according to the policies

### SQL for Checking Policies

```sql
-- View all policies
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
``` 