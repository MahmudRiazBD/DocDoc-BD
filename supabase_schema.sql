-- Stop on error
-- \set ON_ERROR_STOP on

-- Drop existing schema and objects if they exist
DROP TRIGGER IF EXISTS on_public_users_created ON auth.users;
DROP TRIGGER IF EXISTS on_public_files_created ON public.files;
DROP TRIGGER IF EXISTS on_public_clients_created ON public.clients;
DROP TRIGGER IF EXISTS on_public_institutions_created ON public.institutions;
DROP TRIGGER IF EXISTS on_public_bill_addresses_created ON public.bill_addresses;

DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.increment_serial_no();
DROP FUNCTION IF EXISTS public.get_user_role(uuid);

DROP POLICY IF EXISTS "Allow individual read access" ON "public"."users";
DROP POLICY IF EXISTS "Allow individual update access" ON "public"."users";
DROP POLICY IF EXISTS "Allow insert for own data" ON "public"."users";
DROP POLICY IF EXISTS "Allow delete for super-admins" ON "public"."users";

DROP TABLE IF EXISTS public.files CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.institutions CASCADE;
DROP TABLE IF EXISTS public.bill_addresses CASCADE;
DROP TABLE IF EXISTS public.bill_templates CASCADE;

DROP SEQUENCE IF EXISTS public.files_serial_no_seq;
DROP SEQUENCE IF EXISTS public.users_serial_no_seq;
DROP SEQUENCE IF EXISTS public.clients_serial_no_seq;
DROP SEQUENCE IF EXISTS public.institutions_serial_no_seq;
DROP SEQUENCE IF EXISTS public.bill_addresses_serial_no_seq;

-- Create sequences for serial numbers
CREATE SEQUENCE public.users_serial_no_seq START 1;
CREATE SEQUENCE public.files_serial_no_seq START 1;
CREATE SEQUENCE public.clients_serial_no_seq START 1;
CREATE SEQUENCE public.institutions_serial_no_seq START 1;
CREATE SEQUENCE public.bill_addresses_serial_no_seq START 1;


-- Create users table
CREATE TABLE public.users (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    serial_no integer NOT NULL DEFAULT nextval('users_serial_no_seq'::regclass),
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    role text NOT NULL,
    avatar_url text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create clients table
CREATE TABLE public.clients (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    serial_no integer NOT NULL DEFAULT nextval('clients_serial_no_seq'::regclass),
    name text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create institutions table
CREATE TABLE public.institutions (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    serial_no integer NOT NULL DEFAULT nextval('institutions_serial_no_seq'::regclass),
    name text NOT NULL,
    eiin text NOT NULL,
    address text NOT NULL,
    phone text NOT NULL,
    email text NOT NULL,
    website text,
    logo_url text NOT NULL,
    signature_url_1 text NOT NULL,
    signature_url_2 text,
    college_code text,
    school_code text,
    certificate_text text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create bill_templates table
CREATE TABLE public.bill_templates (
    id text NOT NULL PRIMARY KEY,
    name text NOT NULL,
    logo_url text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create bill_addresses table
CREATE TABLE public.bill_addresses (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    serial_no integer NOT NULL DEFAULT nextval('bill_addresses_serial_no_seq'::regclass),
    template_id text NOT NULL REFERENCES public.bill_templates(id) ON DELETE CASCADE,
    dag_no text,
    area text,
    division text,
    address text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);


-- Create files table
CREATE TABLE public.files (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    serial_no integer NOT NULL DEFAULT nextval('files_serial_no_seq'::regclass),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    client_name text NOT NULL,
    applicant_name_bn text,
    applicant_name_en text,
    dob text NOT NULL,
    has_certificate boolean NOT NULL DEFAULT false,
    has_electricity_bill boolean NOT NULL DEFAULT false,
    -- Certificate fields
    institution_id uuid REFERENCES public.institutions(id) ON DELETE SET NULL,
    father_name_bn text,
    mother_name_bn text,
    "class" text,
    roll integer,
    certificate_date text,
    session_year text,
    certificate_status text,
    -- Bill fields
    bill_template_id text REFERENCES public.bill_templates(id) ON DELETE SET NULL,
    bill_holder_name text,
    father_name_en text,
    bill_customer_no text,
    bill_sanc_load text,
    bill_book_no text,
    bill_type text,
    bill_tariff text,
    bill_account_no text,
    bill_meter_no text,
    bill_s_and_d text,
    bill_address jsonb,
    bill_recharge_history jsonb,
    bill_status text
);


-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT role FROM public.users WHERE id = user_id
  );
END;
$$;


-- Enable RLS for all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;


-- RLS Policies for users table
CREATE POLICY "Allow individual read access" ON "public"."users"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Allow individual update access" ON "public"."users"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow insert for own data" ON "public"."users"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow delete for super-admins" ON "public"."users"
AS PERMISSIVE FOR DELETE
TO authenticated
USING ((get_user_role(auth.uid()) = 'super-admin'::text));

-- RLS Policies for all other tables (allow full access for authenticated users)
CREATE POLICY "Allow full access for authenticated users" ON "public"."clients"
AS PERMISSIVE FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow full access for authenticated users" ON "public"."institutions"
AS PERMISSIVE FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow full access for authenticated users" ON "public"."bill_templates"
AS PERMISSIVE FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow full access for authenticated users" ON "public"."bill_addresses"
AS PERMISSIVE FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow full access for authenticated users" ON "public"."files"
AS PERMISSIVE FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Configure storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow authenticated access to files" ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'files');

-- Seed initial data
INSERT INTO public.bill_templates (id, name, logo_url, is_active, created_at)
VALUES 
    ('desco', 'DESCO', 'https://i.ibb.co/Gf894Tz/desco.png', true, now()),
    ('dpdc', 'DPDC', 'https://i.ibb.co/yQd1b25/dpdc.png', true, now())
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    logo_url = EXCLUDED.logo_url,
    is_active = EXCLUDED.is_active;

-- End of script
