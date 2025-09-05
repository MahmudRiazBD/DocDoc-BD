
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      bill_addresses: {
        Row: {
          address: string | null
          area: string | null
          created_at: string
          dag_no: string | null
          division: string | null
          id: string
          serial_no: number
          template_id: string
        }
        Insert: {
          address?: string | null
          area?: string | null
          created_at?: string
          dag_no?: string | null
          division?: string | null
          id?: string
          serial_no?: number
          template_id: string
        }
        Update: {
          address?: string | null
          area?: string | null
          created_at?: string
          dag_no?: string | null
          division?: string | null
          id?: string
          serial_no?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_addresses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "bill_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
        }
        Insert: {
          created_at?: string
          id: string
          is_active?: boolean
          logo_url?: string | null
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          created_at: string
          id: string
          name: string
          serial_no: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          serial_no?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          serial_no?: number
        }
        Relationships: []
      }
      files: {
        Row: {
          applicant_name_bn: string | null
          applicant_name_en: string | null
          bill_account_no: string | null
          bill_address: Json | null
          bill_book_no: string | null
          bill_customer_no: string | null
          bill_holder_name: string | null
          bill_meter_no: string | null
          bill_recharge_history: Json | null
          bill_s_and_d: string | null
          bill_sanc_load: string | null
          bill_status: string | null
          bill_tariff: string | null
          bill_template_id: string | null
          bill_type: string | null
          certificate_date: string | null
          certificate_status: string | null
          class: string | null
          client_id: string
          client_name: string
          created_at: string
          dob: string
          father_name_bn: string | null
          father_name_en: string | null
          has_certificate: boolean
          has_electricity_bill: boolean
          id: string
          institution_id: string | null
          mother_name_bn: string | null
          roll: number | null
          serial_no: number
          session_year: string | null
        }
        Insert: {
          applicant_name_bn?: string | null
          applicant_name_en?: string | null
          bill_account_no?: string | null
          bill_address?: Json | null
          bill_book_no?: string | null
          bill_customer_no?: string | null
          bill_holder_name?: string | null
          bill_meter_no?: string | null
          bill_recharge_history?: Json | null
          bill_s_and_d?: string | null
          bill_sanc_load?: string | null
          bill_status?: string | null
          bill_tariff?: string | null
          bill_template_id?: string | null
          bill_type?: string | null
          certificate_date?: string | null
          certificate_status?: string | null
          class?: string | null
          client_id: string
          client_name: string
          created_at?: string
          dob: string
          father_name_bn?: string | null
          father_name_en?: string | null
          has_certificate?: boolean
          has_electricity_bill?: boolean
          id?: string
          institution_id?: string | null
          mother_name_bn?: string | null
          roll?: number | null
          serial_no?: number
          session_year?: string | null
        }
        Update: {
          applicant_name_bn?: string | null
          applicant_name_en?: string | null
          bill_account_no?: string | null
          bill_address?: Json | null
          bill_book_no?: string | null
          bill_customer_no?: string | null
          bill_holder_name?: string | null
          bill_meter_no?: string | null
          bill_recharge_history?: Json | null
          bill_s_and_d?: string | null
          bill_sanc_load?: string | null
          bill_status?: string | null
          bill_tariff?: string | null
          bill_template_id?: string | null
          bill_type?: string | null
          certificate_date?: string | null
          certificate_status?: string | null
          class?: string | null
          client_id?: string
          client_name?: string
          created_at?: string
          dob?: string
          father_name_bn?: string | null
          father_name_en?: string | null
          has_certificate?: boolean
          has_electricity_bill?: boolean
          id?: string
          institution_id?: string | null
          mother_name_bn?: string | null
          roll?: number | null
          serial_no?: number
          session_year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_bill_template_id_fkey"
            columns: ["bill_template_id"]
            isOneToOne: false
            referencedRelation: "bill_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          address: string
          certificate_text: string
          college_code: string | null
          created_at: string
          eiin: string
          email: string
          id: string
          logo_url: string
          name: string
          phone: string
          school_code: string | null
          serial_no: number
          signature_url_1: string
          signature_url_2: string | null
          website: string | null
        }
        Insert: {
          address: string
          certificate_text: string
          college_code?: string | null
          created_at?: string
          eiin: string
          email: string
          id?: string
          logo_url: string
          name: string
          phone: string
          school_code?: string | null
          serial_no?: number
          signature_url_1: string
          signature_url_2?: string | null
          website?: string | null
        }
        Update: {
          address?: string
          certificate_text?: string
          college_code?: string | null
          created_at?: string
          eiin?: string
          email?: string
          id?: string
          logo_url?: string
          name?: string
          phone?: string
          school_code?: string | null
          serial_no?: number
          signature_url_1?: string
          signature_url_2?: string | null
          website?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          role: string
          serial_no: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          role: string
          serial_no?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string
          serial_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: {
          user_id: string
        }
        Returns: string
      }
      increment_serial_no: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never
