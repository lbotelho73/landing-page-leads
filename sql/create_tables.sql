
-- Criação da tabela de categorias de serviço
CREATE TABLE IF NOT EXISTS public.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adiciona campo service_category_id à tabela services existente
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS service_category_id UUID REFERENCES public.service_categories(id);

-- Adiciona campo professional_commission_percentage à tabela services existente
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS professional_commission_percentage NUMERIC DEFAULT 40;

-- Adiciona campo numeric_id à tabela customers existente para servir como ID numérico
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS numeric_id SERIAL;

-- Adiciona campo de nome artístico (alias) para profissionais
ALTER TABLE public.professionals
ADD COLUMN IF NOT EXISTS alias_name TEXT;

-- Criação da tabela de horário de funcionamento da empresa
CREATE TABLE IF NOT EXISTS public.business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day TEXT NOT NULL,
  is_working BOOLEAN DEFAULT true,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Função para atualizar o campo updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at em cada tabela
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name IN (
      'professionals', 
      'services', 
      'customers', 
      'appointments', 
      'payment_methods', 
      'marketing_channels',
      'service_categories',
      'professional_schedules',
      'business_hours'
    )
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%s_updated_at ON %I;
      CREATE TRIGGER update_%s_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Valores padrão para categorias de serviço
INSERT INTO public.service_categories (name, description, is_active)
VALUES 
  ('Massagem Relaxante', 'Massagens com foco em relaxamento muscular', true),
  ('Massagem Sensual', 'Massagens com foco em estímulo sensual', true),
  ('Massagem Terapêutica', 'Massagens com foco em tratamento terapêutico', true),
  ('Massagem Oriental', 'Massagens tradicionais de culturas orientais', true);

-- Valores padrão para métodos de pagamento
INSERT INTO public.payment_methods (name, additional_fee_percentage, is_active)
VALUES 
  ('Dinheiro', 0, true),
  ('Cartão de Crédito', 3, true),
  ('Cartão de Débito', 2, true),
  ('Pix', 0, true)
ON CONFLICT DO NOTHING;

-- Valores padrão para canais de marketing
INSERT INTO public.marketing_channels (name, description, is_active)
VALUES 
  ('Google', 'Clientes que vieram através de busca no Google', true),
  ('Instagram', 'Clientes que vieram através do Instagram', true),
  ('Facebook', 'Clientes que vieram através do Facebook', true),
  ('Indicação', 'Clientes indicados por outros clientes', true),
  ('WhatsApp', 'Clientes que chegaram através de grupos de WhatsApp', true)
ON CONFLICT DO NOTHING;

-- Valores padrão para horários de funcionamento
INSERT INTO public.business_hours (day, is_working, start_time, end_time)
VALUES 
  ('monday', true, '09:00', '20:00'),
  ('tuesday', true, '09:00', '20:00'),
  ('wednesday', true, '09:00', '20:00'),
  ('thursday', true, '09:00', '20:00'),
  ('friday', true, '09:00', '20:00'),
  ('saturday', true, '10:00', '18:00'),
  ('sunday', false, '10:00', '16:00')
ON CONFLICT DO NOTHING;
