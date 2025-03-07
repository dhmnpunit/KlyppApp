-- Database setup for Klypp app
-- Run this script in your Supabase SQL Editor

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  name TEXT,
  currency TEXT DEFAULT 'USD',
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  subscription_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cost NUMERIC NOT NULL CHECK (cost >= 0),
  renewal_frequency TEXT NOT NULL CHECK (renewal_frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL,
  next_renewal_date DATE NOT NULL,
  category TEXT,
  auto_renews BOOLEAN DEFAULT TRUE,
  is_shared BOOLEAN DEFAULT FALSE,
  max_members INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subscription_members table
CREATE TABLE IF NOT EXISTS public.subscription_members (
  subscription_id UUID REFERENCES public.subscriptions(subscription_id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'left')),
  joined_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (subscription_id, user_id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(subscription_id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_subscription_id UUID,
  p_message TEXT,
  p_type TEXT
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, subscription_id, message, type)
  VALUES (p_user_id, p_subscription_id, p_message, p_type)
  RETURNING notification_id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to accept a subscription invitation
CREATE OR REPLACE FUNCTION accept_subscription_invitation(
  p_subscription_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- Update the subscription_members status to 'accepted'
  UPDATE public.subscription_members
  SET 
    status = 'accepted',
    joined_at = NOW()
  WHERE 
    subscription_id = p_subscription_id AND
    user_id = p_user_id AND
    status = 'pending';
  
  -- Mark related notifications as read
  UPDATE public.notifications
  SET status = 'read'
  WHERE 
    user_id = p_user_id AND
    subscription_id = p_subscription_id AND
    type = 'invite' AND
    status = 'unread';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to reject a subscription invitation
CREATE OR REPLACE FUNCTION reject_subscription_invitation(
  p_subscription_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- Update the subscription_members status to 'rejected'
  UPDATE public.subscription_members
  SET status = 'rejected'
  WHERE 
    subscription_id = p_subscription_id AND
    user_id = p_user_id AND
    status = 'pending';
  
  -- Mark related notifications as read
  UPDATE public.notifications
  SET status = 'read'
  WHERE 
    user_id = p_user_id AND
    subscription_id = p_subscription_id AND
    type = 'invite' AND
    status = 'unread';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get subscription members
CREATE OR REPLACE FUNCTION get_subscription_members(
  p_subscription_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'success', true,
    'data', jsonb_agg(
      jsonb_build_object(
        'user_id', sm.user_id,
        'status', sm.status,
        'joined_at', sm.joined_at,
        'users', jsonb_build_object(
          'username', u.username,
          'name', u.name
        )
      )
    )
  )
  INTO v_result
  FROM public.subscription_members sm
  JOIN public.users u ON sm.user_id = u.user_id
  WHERE sm.subscription_id = p_subscription_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = user_id);

-- Subscriptions table policies
CREATE POLICY "Users can view subscriptions they admin" ON public.subscriptions
  FOR SELECT USING (auth.uid() = admin_id);
  
CREATE POLICY "Users can view subscriptions they are members of" ON public.subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.subscription_members
      WHERE 
        subscription_id = public.subscriptions.subscription_id AND
        user_id = auth.uid() AND
        status = 'accepted'
    )
  );
  
CREATE POLICY "Users can create their own subscriptions" ON public.subscriptions
  FOR INSERT WITH CHECK (auth.uid() = admin_id);
  
CREATE POLICY "Users can update subscriptions they admin" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = admin_id);
  
CREATE POLICY "Users can delete subscriptions they admin" ON public.subscriptions
  FOR DELETE USING (auth.uid() = admin_id);

-- Subscription_members table policies
CREATE POLICY "Users can view their own memberships" ON public.subscription_members
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can view members of subscriptions they admin" ON public.subscription_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE 
        subscription_id = public.subscription_members.subscription_id AND
        admin_id = auth.uid()
    )
  );
  
CREATE POLICY "Users can update their own membership status" ON public.subscription_members
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Admins can manage members" ON public.subscription_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE 
        subscription_id = public.subscription_members.subscription_id AND
        admin_id = auth.uid()
    )
  );

-- Notifications table policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Create triggers for updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriptions_modtime
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_modified_column(); 