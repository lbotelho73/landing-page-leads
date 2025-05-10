
-- Create function to get table columns for import/export features
CREATE OR REPLACE FUNCTION public.get_table_columns(table_name TEXT)
RETURNS SETOF TEXT AS $$
BEGIN
  RETURN QUERY
  SELECT column_name::TEXT
  FROM information_schema.columns
  WHERE table_schema = 'public' 
  AND table_name = $1
  AND column_name NOT IN ('id', 'created_at', 'updated_at')
  AND column_name NOT LIKE '%default-value%'
  ORDER BY ordinal_position;
END;
$$ LANGUAGE plpgsql;

-- Create function to verify if a table exists
CREATE OR REPLACE FUNCTION public.get_table_existence(table_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' 
    AND table_name = $1
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'role', 'viewer'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to synchronize auth users with user_profiles
-- This is a security definer function that can directly access auth schema
CREATE OR REPLACE FUNCTION public.sync_users_to_profiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  -- Insert users from auth.users that don't exist in user_profiles
  INSERT INTO public.user_profiles (id, email, role)
  SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'role', 'viewer')::text
  FROM auth.users au
  LEFT JOIN public.user_profiles up ON au.id = up.id
  WHERE up.id IS NULL;

  -- Update any mismatched emails
  UPDATE public.user_profiles up
  SET email = au.email
  FROM auth.users au
  WHERE up.id = au.id AND up.email <> au.email;

END;
$$;

-- Create trigger for new user registration
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
  END IF;
END
$$;

-- Make sure we have our essential tables created
-- Check if services table exists and create it if not
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'services') THEN
    CREATE TABLE public.services (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      name TEXT NOT NULL,
      description TEXT,
      duration INT NOT NULL, -- duration in minutes
      price DECIMAL(10, 2) NOT NULL,
      requires_two_professionals BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE
    );
  END IF;
END $$;

-- Check if appointments table exists and create it if not
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'appointments') THEN
    CREATE TABLE public.appointments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      date DATE NOT NULL,
      time TIME NOT NULL,
      customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
      service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
      primary_professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
      secondary_professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
      service_duration INT NOT NULL,
      service_price DECIMAL(10, 2) NOT NULL,
      payment_method_id UUID,
      has_discount BOOLEAN DEFAULT FALSE,
      discount_percentage DECIMAL(5, 2) DEFAULT 0.0,
      final_price DECIMAL(10, 2) NOT NULL,
      notes TEXT,
      is_completed BOOLEAN DEFAULT FALSE,
      cancellation_reason TEXT,
      marketing_channel_id UUID REFERENCES marketing_channels(id) ON DELETE SET NULL,
      professional_payment_status TEXT DEFAULT 'To be paid',
      professional_payment_date TIMESTAMP WITH TIME ZONE
    );
  ELSE
    -- Check for professional_payment columns and add them if they don't exist
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_schema = 'public' 
                     AND table_name = 'appointments' 
                     AND column_name = 'professional_payment_status') THEN
        ALTER TABLE public.appointments ADD COLUMN professional_payment_status TEXT DEFAULT 'To be paid';
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_schema = 'public' 
                     AND table_name = 'appointments' 
                     AND column_name = 'professional_payment_date') THEN
        ALTER TABLE public.appointments ADD COLUMN professional_payment_date TIMESTAMP WITH TIME ZONE;
      END IF;
    END $$;
  END IF;
END $$;

-- Ensure user_profiles table exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    CREATE TABLE public.user_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    
    -- Add an index on email for faster lookups
    CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);
    
    -- Enable RLS on user_profiles
    ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
    
    -- Create policy to allow authenticated users to view all user profiles
    CREATE POLICY "Allow authenticated users to view all profiles" 
      ON public.user_profiles 
      FOR SELECT 
      TO authenticated 
      USING (true);
      
    -- Create policy to allow only admins to update user profiles
    CREATE POLICY "Allow admins to update user profiles" 
      ON public.user_profiles 
      FOR UPDATE 
      TO authenticated 
      USING (auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'admin'));
      
    -- Create policy to allow only admins to delete user profiles
    CREATE POLICY "Allow admins to delete user profiles" 
      ON public.user_profiles 
      FOR DELETE 
      TO authenticated 
      USING (auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'admin'));
  END IF;
END $$;

-- Ensure permissions table exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'permissions') THEN
    CREATE TABLE public.permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    
    -- Add some default permissions
    INSERT INTO public.permissions (name, description) VALUES
      ('dashboard:view', 'View the dashboard'),
      ('customers:view', 'View customers'),
      ('customers:edit', 'Edit customers'),
      ('appointments:view', 'View appointments'),
      ('appointments:edit', 'Create and edit appointments'),
      ('appointments:delete', 'Delete appointments'),
      ('professionals:view', 'View professionals'),
      ('professionals:edit', 'Edit professionals'),
      ('services:view', 'View services'),
      ('services:edit', 'Edit services'),
      ('reports:view', 'View reports'),
      ('settings:view', 'View settings'),
      ('settings:edit', 'Edit settings'),
      ('users:manage', 'Manage users and permissions');
      
    -- Enable RLS on permissions
    ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
    
    -- Create policy to allow authenticated users to view all permissions
    CREATE POLICY "Allow authenticated users to view all permissions" 
      ON public.permissions 
      FOR SELECT 
      TO authenticated 
      USING (true);
      
    -- Create policy to allow only admins to update permissions
    CREATE POLICY "Allow admins to update permissions" 
      ON public.permissions 
      FOR UPDATE 
      TO authenticated 
      USING (auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'admin'));
  END IF;
END $$;

-- Ensure role_permissions table exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'role_permissions') THEN
    CREATE TABLE public.role_permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      role TEXT NOT NULL,
      permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      UNIQUE(role, permission_id)
    );
    
    -- Enable RLS on role_permissions
    ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
    
    -- Create policy to allow authenticated users to view all role_permissions
    CREATE POLICY "Allow authenticated users to view all role permissions" 
      ON public.role_permissions 
      FOR SELECT 
      TO authenticated 
      USING (true);
      
    -- Create policy to allow only admins to insert role_permissions
    CREATE POLICY "Allow admins to insert role permissions" 
      ON public.role_permissions 
      FOR INSERT 
      TO authenticated 
      WITH CHECK (auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'admin'));
      
    -- Create policy to allow only admins to update role_permissions
    CREATE POLICY "Allow admins to update role permissions" 
      ON public.role_permissions 
      FOR UPDATE 
      TO authenticated 
      USING (auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'admin'));
      
    -- Create policy to allow only admins to delete role_permissions
    CREATE POLICY "Allow admins to delete role permissions" 
      ON public.role_permissions 
      FOR DELETE 
      TO authenticated 
      USING (auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'admin'));
      
    -- Add default permissions for roles
    -- Admin role gets all permissions
    INSERT INTO public.role_permissions (role, permission_id)
    SELECT 'admin', id FROM public.permissions;
    
    -- Editor role gets view and edit but not management or delete permissions
    INSERT INTO public.role_permissions (role, permission_id)
    SELECT 'editor', id FROM public.permissions 
    WHERE name LIKE '%:view' OR name LIKE '%:edit';
    
    -- Viewer role gets only view permissions
    INSERT INTO public.role_permissions (role, permission_id)
    SELECT 'viewer', id FROM public.permissions 
    WHERE name LIKE '%:view';
  END IF;
END $$;

-- Run the sync function to ensure all users are in user_profiles
SELECT sync_users_to_profiles();

