
-- TABLES FOR SENSUAL FLOW CLINIC MANAGEMENT SYSTEM

-- Enable the RLS (Row Level Security)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-super-secret-jwt-token-with-at-least-32-characters-long';

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create professionals table for managing masseuses
CREATE TABLE IF NOT EXISTS professionals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  commission_percentage DECIMAL(5, 2) NOT NULL, -- e.g., 50.00 for 50%
  is_active BOOLEAN DEFAULT TRUE,
  profile_image_url TEXT,
  notes TEXT
);

-- Create a days of the week enum type
CREATE TYPE day_of_week AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');

-- Create professional_schedules table for tracking work days
CREATE TABLE IF NOT EXISTS professional_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  day_of_week day_of_week NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  UNIQUE(professional_id, day_of_week)
);

-- Create services table for different massage types
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  description TEXT,
  duration INT NOT NULL, -- duration in minutes
  price DECIMAL(10, 2) NOT NULL,
  requires_two_professionals BOOLEAN DEFAULT FALSE, -- For Four Hands massage
  is_active BOOLEAN DEFAULT TRUE
);

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  additional_fee_percentage DECIMAL(5, 2) DEFAULT 0.0, -- e.g., 2.50 for 2.5%
  is_active BOOLEAN DEFAULT TRUE
);

-- Add common payment methods
INSERT INTO payment_methods (name, additional_fee_percentage) 
VALUES 
  ('Cash', 0),
  ('Credit Card', 2.5),
  ('Debit Card', 1.5),
  ('Bank Transfer', 0),
  ('PayPal', 3.0),
  ('Venmo', 1.0)
ON CONFLICT (name) DO NOTHING;

-- Create service_payment_methods junction table
CREATE TABLE IF NOT EXISTS service_payment_methods (
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  payment_method_id UUID REFERENCES payment_methods(id) ON DELETE CASCADE,
  PRIMARY KEY (service_id, payment_method_id)
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  whatsapp_number TEXT,
  allows_whatsapp BOOLEAN DEFAULT TRUE,
  referral_source TEXT, -- How they found the clinic
  notes TEXT
);

-- Create marketing_channels table for advertising tracking
CREATE TABLE IF NOT EXISTS marketing_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- Add common marketing channels
INSERT INTO marketing_channels (name) 
VALUES 
  ('Google Ads'),
  ('Meta Ads'),
  ('Instagram Organic'),
  ('Friend Referral'),
  ('Website'),
  ('Walk-in'),
  ('Local Advertisement')
ON CONFLICT (name) DO NOTHING;

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date DATE NOT NULL,
  time TIME NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  primary_professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
  secondary_professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL, -- For Four Hands massage
  service_duration INT NOT NULL, -- duration in minutes
  service_price DECIMAL(10, 2) NOT NULL,
  payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
  has_discount BOOLEAN DEFAULT FALSE,
  discount_percentage DECIMAL(5, 2) DEFAULT 0.0, -- e.g., 10.00 for 10%
  final_price DECIMAL(10, 2) NOT NULL, -- Price after discounts and fees
  notes TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  cancellation_reason TEXT,
  marketing_channel_id UUID REFERENCES marketing_channels(id) ON DELETE SET NULL
);

-- Create professional_payments table
CREATE TABLE IF NOT EXISTS professional_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  commission_percentage DECIMAL(5, 2) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'unpaid', -- 'unpaid', 'paid'
  payment_date DATE,
  notes TEXT
);

-- Create RLS policies
-- Policy for professionals table
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
CREATE POLICY professionals_policy ON professionals
  USING (auth.role() = 'authenticated');

-- Policy for professional_schedules table
ALTER TABLE professional_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY professional_schedules_policy ON professional_schedules
  USING (auth.role() = 'authenticated');

-- Policy for services table
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY services_policy ON services
  USING (auth.role() = 'authenticated');

-- Policy for payment_methods table
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY payment_methods_policy ON payment_methods
  USING (auth.role() = 'authenticated');

-- Policy for service_payment_methods table
ALTER TABLE service_payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_payment_methods_policy ON service_payment_methods
  USING (auth.role() = 'authenticated');

-- Policy for customers table
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY customers_policy ON customers
  USING (auth.role() = 'authenticated');

-- Policy for marketing_channels table
ALTER TABLE marketing_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY marketing_channels_policy ON marketing_channels
  USING (auth.role() = 'authenticated');

-- Policy for appointments table
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY appointments_policy ON appointments
  USING (auth.role() = 'authenticated');

-- Policy for professional_payments table
ALTER TABLE professional_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY professional_payments_policy ON professional_payments
  USING (auth.role() = 'authenticated');

-- Create functions for auto-updating timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-updating timestamps
CREATE TRIGGER update_professionals_timestamp
BEFORE UPDATE ON professionals
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_services_timestamp
BEFORE UPDATE ON services
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_customers_timestamp
BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_appointments_timestamp
BEFORE UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_professional_payments_timestamp
BEFORE UPDATE ON professional_payments
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Create views for reports
-- Professional earnings view
CREATE OR REPLACE VIEW professional_earnings AS
SELECT 
  p.id AS professional_id,
  p.first_name,
  p.last_name,
  pp.payment_status,
  SUM(pp.amount) AS total_earnings,
  COUNT(DISTINCT a.id) AS total_appointments,
  date_trunc('month', a.date) AS month
FROM professionals p
JOIN professional_payments pp ON p.id = pp.professional_id
JOIN appointments a ON pp.appointment_id = a.id
GROUP BY p.id, p.first_name, p.last_name, pp.payment_status, date_trunc('month', a.date)
ORDER BY date_trunc('month', a.date) DESC, p.last_name;

-- Marketing channel performance view
CREATE OR REPLACE VIEW marketing_performance AS
SELECT 
  mc.id AS channel_id,
  mc.name AS channel_name,
  COUNT(DISTINCT a.id) AS total_appointments,
  SUM(a.final_price) AS total_revenue,
  EXTRACT(MONTH FROM a.date) AS month,
  EXTRACT(YEAR FROM a.date) AS year
FROM marketing_channels mc
JOIN appointments a ON mc.id = a.marketing_channel_id
WHERE a.is_completed = TRUE
GROUP BY mc.id, mc.name, EXTRACT(MONTH FROM a.date), EXTRACT(YEAR FROM a.date)
ORDER BY EXTRACT(YEAR FROM a.date) DESC, EXTRACT(MONTH FROM a.date) DESC, total_revenue DESC;

-- Daily revenue view
CREATE OR REPLACE VIEW daily_revenue AS
SELECT 
  a.date,
  COUNT(a.id) AS total_appointments,
  SUM(a.final_price) AS total_revenue,
  SUM(pp.amount) AS total_commission_paid,
  SUM(a.final_price - pp.amount) AS net_revenue
FROM appointments a
LEFT JOIN professional_payments pp ON a.id = pp.appointment_id
WHERE a.is_completed = TRUE
GROUP BY a.date
ORDER BY a.date DESC;
