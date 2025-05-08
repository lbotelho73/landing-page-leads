
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
