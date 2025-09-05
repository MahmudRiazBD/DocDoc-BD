-- Full Supabase Schema for DocDoc BD
-- This script is designed to be idempotent. It will drop existing objects before recreating them.

-- Stop on error
\set ON_ERROR_STOP on

-- =============================================
-- 1. Drop existing objects in reverse order
-- =============================================
DROP POLICY IF EXISTS "Allow public read access to logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
DROP FUNCTION IF EXISTS public.set_serial_no();
DROP TRIGGER IF EXISTS set_serial_no_on_users on public.users;
DROP TRIGGER IF EXISTS set_serial_no_on_files on public.files;
DROP TRIGGER IF EXISTS set_serial_no_on_clients on public.clients;
DROP TRIGGER IF EXISTS set_serial_no_on_institutions on public.institutions;
DROP TRIGGER IF EXISTS set_serial_no_on_bill_addresses on public.bill_addresses;

-- Drop tables, cascading to dependent objects like foreign keys and sequences
DROP TABLE IF EXISTS public.files CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.institutions CASCADE;
DROP TABLE IF EXISTS public.bill_templates CASCADE;
DROP TABLE IF EXISTS public.bill_addresses CASCADE;

-- =============================================
-- 2. Create Tables
-- =============================================

-- Table for Users
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    serial_no BIGINT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'staff',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.users IS 'Stores public user information.';

-- Table for Clients
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_no BIGINT,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.clients IS 'Stores client information.';

-- Table for Institutions
CREATE TABLE public.institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_no BIGINT,
    name TEXT NOT NULL,
    eiin TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    logo_url TEXT,
    signature_url_1 TEXT,
    signature_url_2 TEXT,
    college_code TEXT,
    school_code TEXT,
    certificate_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.institutions IS 'Stores educational institution details for certificates.';

-- Table for Bill Templates (DESCO, DPDC, etc.)
CREATE TABLE public.bill_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    logo_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.bill_templates IS 'Stores templates for electricity bills.';

-- Table for Bill Addresses
CREATE TABLE public.bill_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_no BIGINT,
    dag_no TEXT,
    area TEXT,
    division TEXT,
    address TEXT,
    template_id TEXT NOT NULL REFERENCES public.bill_templates(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.bill_addresses IS 'Stores addresses used for generating electricity bills.';

-- Table for Files (the central entity)
CREATE TABLE public.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_no BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Client Information
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    client_name TEXT NOT NULL,

    -- Core Applicant Information
    applicant_name_bn TEXT,
    applicant_name_en TEXT,
    dob TEXT NOT NULL, -- YYYY-MM-DD or YYYY

    -- Control flags
    has_certificate BOOLEAN NOT NULL DEFAULT FALSE,
    has_electricity_bill BOOLEAN NOT NULL DEFAULT FALSE,

    -- Certificate-related fields
    institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    father_name_bn TEXT,
    mother_name_bn TEXT,
    "class" TEXT,
    roll INTEGER,
    certificate_date DATE,
    session_year TEXT,
    certificate_status TEXT,

    -- Electricity Bill-related fields
    bill_template_id TEXT REFERENCES public.bill_templates(id) ON DELETE SET NULL,
    bill_holder_name TEXT,
    father_name_en TEXT,
    bill_customer_no TEXT,
    bill_sanc_load TEXT,
    bill_book_no TEXT,
    bill_type TEXT,
    bill_tariff TEXT,
    bill_account_no TEXT,
    bill_meter_no TEXT,
    bill_s_and_d TEXT,
    bill_address JSONB,
    bill_recharge_history JSONB,
    bill_status TEXT
);
COMMENT ON TABLE public.files IS 'Central table storing file information for applicants.';

-- =============================================
-- 3. Create Sequences for Serial Numbers
-- =============================================
CREATE SEQUENCE IF NOT EXISTS users_serial_no_seq;
CREATE SEQUENCE IF NOT EXISTS files_serial_no_seq;
CREATE SEQUENCE IF NOT EXISTS clients_serial_no_seq;
CREATE SEQUENCE IF NOT EXISTS institutions_serial_no_seq;
CREATE SEQUENCE IF NOT EXISTS bill_addresses_serial_no_seq;


-- =============================================
-- 4. Create Trigger Function for Serial Numbers
-- =============================================
CREATE OR REPLACE FUNCTION public.set_serial_no()
RETURNS TRIGGER AS $$
DECLARE
    seq_name TEXT;
BEGIN
    seq_name := TG_TABLE_NAME || '_serial_no_seq';
    NEW.serial_no := nextval(seq_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
COMMENT ON FUNCTION public.set_serial_no() IS 'Sets a unique, sequential serial number for a new row.';


-- =============================================
-- 5. Create Triggers
-- =============================================
CREATE TRIGGER set_serial_no_on_users
BEFORE INSERT ON public.users
FOR EACH ROW EXECUTE FUNCTION public.set_serial_no();

CREATE TRIGGER set_serial_no_on_files
BEFORE INSERT ON public.files
FOR EACH ROW EXECUTE FUNCTION public.set_serial_no();

CREATE TRIGGER set_serial_no_on_clients
BEFORE INSERT ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.set_serial_no();

CREATE TRIGGER set_serial_no_on_institutions
BEFORE INSERT ON public.institutions
FOR EACH ROW EXECUTE FUNCTION public.set_serial_no();

CREATE TRIGGER set_serial_no_on_bill_addresses
BEFORE INSERT ON public.bill_addresses
FOR EACH ROW EXECUTE FUNCTION public.set_serial_no();

-- =============================================
-- 6. Enable Row Level Security (RLS)
-- =============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 7. Create RLS Policies
-- =============================================
-- Policies for 'users' table
CREATE POLICY "Allow authenticated users to read all users" ON public.users FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Allow users to update their own data" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Allow admin/super-admin to insert/delete users" ON public.users FOR ALL USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'super-admin')
);

-- Policies for other tables (simple "allow all to authenticated" for this app's logic)
CREATE POLICY "Allow all access to authenticated users" ON public.clients FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "Allow all access to authenticated users" ON public.institutions FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "Allow all access to authenticated users" ON public.bill_templates FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "Allow all access to authenticated users" ON public.bill_addresses FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "Allow all access to authenticated users" ON public.files FOR ALL TO authenticated USING (TRUE);


-- =============================================
-- 8. Configure Storage
-- =============================================
-- Ensure the 'images' bucket exists. Run this manually if needed.
-- INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true) ON CONFLICT (id) DO NOTHING;

-- Allow public read access to the images bucket for displaying logos, etc.
CREATE POLICY "Allow public read access to logos" ON storage.objects
FOR SELECT USING ( bucket_id = 'images' );

-- Allow authenticated users to upload files to the 'images' bucket
CREATE POLICY "Allow authenticated users to upload" ON storage.objects
FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'images' );
