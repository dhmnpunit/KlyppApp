-- SQL script to create RLS policy for users table

-- Create policy to allow users to insert their own profile
DROP POLICY IF EXISTS "users_insert" ON public.users;
CREATE POLICY "users_insert" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Ensure RLS is enabled on the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY; 