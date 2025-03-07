-- Klypp App - RLS Policies Setup Script
-- This script sets up all the Row Level Security (RLS) policies for the Klypp app

-- First, disable RLS on all tables to start fresh
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Create policies for users table
CREATE POLICY "users_select" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "users_update" ON public.users
    FOR UPDATE USING (auth.uid() = user_id);

-- Create policies for subscriptions table
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

CREATE POLICY "subscriptions_insert" ON public.subscriptions
    FOR INSERT WITH CHECK (admin_id = auth.uid());

CREATE POLICY "subscriptions_update" ON public.subscriptions
    FOR UPDATE USING (admin_id = auth.uid());

CREATE POLICY "subscriptions_delete" ON public.subscriptions
    FOR DELETE USING (admin_id = auth.uid());

-- Create policies for subscription_members table
CREATE POLICY "subscription_members_select" ON public.subscription_members
    FOR SELECT USING (
        user_id = auth.uid() OR
        subscription_id IN (
            SELECT subscription_id 
            FROM subscriptions 
            WHERE admin_id = auth.uid()
        )
    );

CREATE POLICY "subscription_members_insert" ON public.subscription_members
    FOR INSERT WITH CHECK (
        subscription_id IN (
            SELECT subscription_id 
            FROM subscriptions 
            WHERE admin_id = auth.uid()
        )
    );

CREATE POLICY "subscription_members_update" ON public.subscription_members
    FOR UPDATE USING (
        user_id = auth.uid() OR
        subscription_id IN (
            SELECT subscription_id 
            FROM subscriptions 
            WHERE admin_id = auth.uid()
        )
    );

CREATE POLICY "subscription_members_delete" ON public.subscription_members
    FOR DELETE USING (
        user_id = auth.uid() OR
        subscription_id IN (
            SELECT subscription_id 
            FROM subscriptions 
            WHERE admin_id = auth.uid()
        )
    );

-- Create policies for notifications table
CREATE POLICY "notifications_select" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_update" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "notifications_insert" ON public.notifications
    FOR INSERT WITH CHECK (true);  -- Allow all inserts, control at application level

-- Re-enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'subscriptions', 'subscription_members', 'notifications');

-- Verify policies are created
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd; 