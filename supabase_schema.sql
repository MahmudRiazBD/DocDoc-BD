-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- USERS Table
-- This table will store user data. The ID should match the Firebase Auth UID.
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY NOT NULL, -- Firebase UID
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super-admin', 'admin', 'staff')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- CLIENTS Table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- INSTITUTIONS Table
CREATE TABLE IF NOT EXISTS public.institutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    serial_no SERIAL UNIQUE,
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
    certificate_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- FILES Table
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    serial_no SERIAL UNIQUE,
    applicant_name TEXT NOT NULL,
    dob TEXT NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name TEXT, -- Denormalized for easier access
    has_certificate BOOLEAN DEFAULT FALSE,
    has_electricity_bill BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- CERTIFICATES Table
CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    serial_no SERIAL UNIQUE,
    file_id UUID REFERENCES public.files(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    father_name TEXT NOT NULL,
    mother_name TEXT NOT NULL,
    dob DATE NOT NULL,
    class TEXT NOT NULL,
    roll INTEGER NOT NULL,
    certificate_date DATE NOT NULL,
    session_year TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'প্রিন্ট হয়নি',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- BILL_TEMPLATES Table
CREATE TABLE IF NOT EXISTS public.bill_templates (
    id TEXT PRIMARY KEY, -- 'desco', 'dpdc'
    name TEXT NOT NULL,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- BILL_ADDRESSES Table
CREATE TABLE IF NOT EXISTS public.bill_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    serial_no SERIAL UNIQUE,
    template_id TEXT REFERENCES public.bill_templates(id) ON DELETE CASCADE,
    dag_no TEXT,
    area TEXT,
    division TEXT,
    address TEXT, -- For DPDC-like templates
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ELECTRICITY_BILLS Table
CREATE TABLE IF NOT EXISTS public.electricity_bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    serial_no SERIAL UNIQUE,
    file_id UUID REFERENCES public.files(id) ON DELETE CASCADE,
    template_id TEXT REFERENCES public.bill_templates(id) ON DELETE SET NULL,
    bill_holder_name TEXT NOT NULL,
    customer_no TEXT,
    sanc_load TEXT,
    book_no TEXT,
    type TEXT,
    tariff TEXT,
    account_no TEXT NOT NULL,
    meter_no TEXT NOT NULL,
    s_and_d TEXT,
    address JSONB, -- Stores { dagNo, area, division, address }
    recharge_history JSONB, -- Stores the array of recharge entries
    status TEXT NOT NULL DEFAULT 'প্রিন্ট হয়নি',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- This adds a new column to store the profile picture URL in your users table.
ALTER TABLE public.users
ADD COLUMN avatar_url TEXT;


-- RLS Policies (Row Level Security) - Start with disabled RLS for simplicity
-- You should enable RLS and define policies for production.
-- Example:
-- ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow logged-in users to read files" ON public.files FOR SELECT USING (auth.role() = 'authenticated');
-- CREATE POLICY "Allow users to insert their own files" ON public.files FOR INSERT WITH CHECK (auth.uid() = user_id);
