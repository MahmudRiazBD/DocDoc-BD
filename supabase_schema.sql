-- Drop existing objects to ensure a clean setup.
-- The "IF EXISTS" clause prevents errors if the objects don't exist.
DROP TRIGGER IF EXISTS on_public_users_insert ON public.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

DROP TRIGGER IF EXISTS set_serial_no_on_users ON public.users;
DROP TRIGGER IF EXISTS set_serial_no_on_clients ON public.clients;
DROP TRIGGER IF EXISTS set_serial_no_on_institutions ON public.institutions;
DROP TRIGGER IF EXISTS set_serial_no_on_bill_addresses ON public.bill_addresses;
DROP TRIGGER IF EXISTS set_serial_no_on_files ON public.files;

DROP FUNCTION IF EXISTS public.set_serial_id();

DROP TABLE IF EXISTS public.files;
DROP TABLE IF EXISTS public.bill_addresses;
DROP TABLE IF EXISTS public.bill_templates;
DROP TABLE IF EXISTS public.institutions;
DROP TABLE IF EXISTS public.clients;
DROP TABLE IF EXISTS public.users;

DROP SEQUENCE IF EXISTS public.users_serial_no_seq;
DROP SEQUENCE IF EXISTS public.clients_serial_no_seq;
DROP SEQUENCE IF EXISTS public.institutions_serial_no_seq;
DROP SEQUENCE IF EXISTS public.bill_addresses_serial_no_seq;
DROP SEQUENCE IF EXISTS public.files_serial_no_seq;


-- Create sequences for auto-incrementing serial numbers
CREATE SEQUENCE public.users_serial_no_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE public.clients_serial_no_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE public.institutions_serial_no_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE public.bill_addresses_serial_no_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE public.files_serial_no_seq START WITH 1 INCREMENT BY 1;

-- Create a function to set serial numbers
CREATE OR REPLACE FUNCTION public.set_serial_id()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'users' THEN
    NEW.serial_no = nextval('public.users_serial_no_seq');
  ELSIF TG_TABLE_NAME = 'clients' THEN
    NEW.serial_no = nextval('public.clients_serial_no_seq');
  ELSIF TG_TABLE_NAME = 'institutions' THEN
    NEW.serial_no = nextval('public.institutions_serial_no_seq');
  ELSIF TG_TABLE_NAME = 'bill_addresses' THEN
    NEW.serial_no = nextval('public.bill_addresses_serial_no_seq');
  ELSIF TG_TABLE_NAME = 'files' THEN
    NEW.serial_no = nextval('public.files_serial_no_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- Table: users
CREATE TABLE public.users (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    serial_no bigint NOT NULL UNIQUE DEFAULT nextval('users_serial_no_seq'::regclass),
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    role text NOT NULL CHECK (role IN ('super-admin', 'admin', 'staff')),
    avatar_url text,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read users" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow individual user to update their own info" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow admin to manage users" ON public.users FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'super-admin'));


-- Table: clients
CREATE TABLE public.clients (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_no bigint NOT NULL UNIQUE DEFAULT nextval('clients_serial_no_seq'::regclass),
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated users" ON public.clients FOR ALL TO authenticated USING (true);


-- Table: institutions
CREATE TABLE public.institutions (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_no bigint NOT NULL UNIQUE DEFAULT nextval('institutions_serial_no_seq'::regclass),
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
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated users" ON public.institutions FOR ALL TO authenticated USING (true);


-- Table: bill_templates
CREATE TABLE public.bill_templates (
    id text NOT NULL PRIMARY KEY,
    name text NOT NULL,
    logo_url text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bill_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated users" ON public.bill_templates FOR ALL TO authenticated USING (true);


-- Table: bill_addresses
CREATE TABLE public.bill_addresses (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_no bigint NOT NULL UNIQUE DEFAULT nextval('bill_addresses_serial_no_seq'::regclass),
    dag_no text,
    area text,
    division text,
    address text,
    template_id text NOT NULL REFERENCES public.bill_templates(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bill_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated users" ON public.bill_addresses FOR ALL TO authenticated USING (true);


-- Table: files
CREATE TABLE public.files (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_no bigint NOT NULL UNIQUE DEFAULT nextval('files_serial_no_seq'::regclass),
    created_at timestamptz NOT NULL DEFAULT now(),
    client_id uuid NOT NULL REFERENCES public.clients(id),
    client_name text NOT NULL,
    applicant_name_bn text,
    applicant_name_en text,
    dob text NOT NULL,
    has_certificate boolean NOT NULL DEFAULT false,
    has_electricity_bill boolean NOT NULL DEFAULT false,
    institution_id uuid REFERENCES public.institutions(id),
    father_name_bn text,
    mother_name_bn text,
    class text,
    roll integer,
    certificate_date date,
    session_year text,
    certificate_status text,
    bill_template_id text REFERENCES public.bill_templates(id),
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
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated users" ON public.files FOR ALL TO authenticated USING (true);


-- Triggers to auto-set serial numbers on insert
CREATE TRIGGER set_serial_no_on_users BEFORE INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_serial_id();
CREATE TRIGGER set_serial_no_on_clients BEFORE INSERT ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_serial_id();
CREATE TRIGGER set_serial_no_on_institutions BEFORE INSERT ON public.institutions FOR EACH ROW EXECUTE FUNCTION public.set_serial_id();
CREATE TRIGGER set_serial_no_on_bill_addresses BEFORE INSERT ON public.bill_addresses FOR EACH ROW EXECUTE FUNCTION public.set_serial_id();
CREATE TRIGGER set_serial_no_on_files BEFORE INSERT ON public.files FOR EACH ROW EXECUTE FUNCTION public.set_serial_id();


-- Function to copy user data from auth.users to public.users on new user signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'name',
    NEW.email,
    NEW.raw_user_meta_data ->> 'role',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Trigger to call the function on new user insert in auth.users
CREATE TRIGGER on_public_users_insert
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Seed initial bill templates if they don't exist
INSERT INTO public.bill_templates (id, name, logo_url, is_active, created_at)
VALUES
    ('desco', 'DESCO', 'https://i.ibb.co/Gf894Tz/desco.png', true, now()),
    ('dpdc', 'DPDC', 'https://i.ibb.co/yQd1b25/dpdc.png', true, now())
ON CONFLICT (id) DO NOTHING;


-- Set up storage policies
-- This assumes a bucket named 'uploads' has been created.
-- If you named your bucket differently, please update 'uploads' to your bucket name.
-- Example: CREATE POLICY "Allow authenticated users to upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'your_bucket_name');

-- Allow authenticated users to see all files in the 'uploads' bucket.
CREATE POLICY "Allow authenticated users to view uploads"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'uploads' );

-- Allow authenticated users to upload files to the 'uploads' bucket.
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'uploads' );
