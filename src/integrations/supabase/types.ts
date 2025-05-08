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
      appointments: {
        Row: {
          cancellation_reason: string | null
          created_at: string | null
          customer_id: string | null
          date: string
          discount_percentage: number | null
          final_price: number
          has_discount: boolean | null
          id: string
          is_completed: boolean | null
          marketing_channel_id: string | null
          notes: string | null
          payment_method_id: string | null
          primary_professional_id: string | null
          professional_payment_date: string | null
          professional_payment_status: string | null
          secondary_professional_id: string | null
          service_duration: number
          service_id: string | null
          service_price: number
          time: string
          updated_at: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          created_at?: string | null
          customer_id?: string | null
          date: string
          discount_percentage?: number | null
          final_price: number
          has_discount?: boolean | null
          id?: string
          is_completed?: boolean | null
          marketing_channel_id?: string | null
          notes?: string | null
          payment_method_id?: string | null
          primary_professional_id?: string | null
          professional_payment_date?: string | null
          professional_payment_status?: string | null
          secondary_professional_id?: string | null
          service_duration: number
          service_id?: string | null
          service_price: number
          time: string
          updated_at?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          created_at?: string | null
          customer_id?: string | null
          date?: string
          discount_percentage?: number | null
          final_price?: number
          has_discount?: boolean | null
          id?: string
          is_completed?: boolean | null
          marketing_channel_id?: string | null
          notes?: string | null
          payment_method_id?: string | null
          primary_professional_id?: string | null
          professional_payment_date?: string | null
          professional_payment_status?: string | null
          secondary_professional_id?: string | null
          service_duration?: number
          service_id?: string | null
          service_price?: number
          time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_appointments_customer"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_appointments_marketing_channel"
            columns: ["marketing_channel_id"]
            isOneToOne: false
            referencedRelation: "marketing_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_appointments_payment_method"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_appointments_primary_professional"
            columns: ["primary_professional_id"]
            isOneToOne: false
            referencedRelation: "professional_earnings"
            referencedColumns: ["professional_id"]
          },
          {
            foreignKeyName: "fk_appointments_primary_professional"
            columns: ["primary_professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_appointments_secondary_professional"
            columns: ["secondary_professional_id"]
            isOneToOne: false
            referencedRelation: "professional_earnings"
            referencedColumns: ["professional_id"]
          },
          {
            foreignKeyName: "fk_appointments_secondary_professional"
            columns: ["secondary_professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_appointments_service"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          created_at: string | null
          day: string
          end_time: string
          id: string
          is_working: boolean | null
          start_time: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day: string
          end_time: string
          id?: string
          is_working?: boolean | null
          start_time: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day?: string
          end_time?: string
          id?: string
          is_working?: boolean | null
          start_time?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          allows_whatsapp: boolean | null
          created_at: string | null
          first_name: string
          id: string
          last_name: string
          notes: string | null
          numeric_id: number
          referral_source: string | null
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          allows_whatsapp?: boolean | null
          created_at?: string | null
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          numeric_id?: number
          referral_source?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          allows_whatsapp?: boolean | null
          created_at?: string | null
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          numeric_id?: number
          referral_source?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      marketing_channels: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          additional_fee_percentage: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          additional_fee_percentage?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          additional_fee_percentage?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      professional_payments: {
        Row: {
          amount: number
          appointment_id: string | null
          commission_percentage: number
          created_at: string | null
          id: string
          notes: string | null
          payment_date: string | null
          payment_status: string
          professional_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          commission_percentage: number
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_status?: string
          professional_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          commission_percentage?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_status?: string
          professional_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_professional_payments_appointment"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_professional_payments_professional"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_earnings"
            referencedColumns: ["professional_id"]
          },
          {
            foreignKeyName: "fk_professional_payments_professional"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_schedules: {
        Row: {
          created_at: string | null
          day_of_week: string
          end_time: string
          id: string
          professional_id: string | null
          start_time: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week: string
          end_time: string
          id?: string
          professional_id?: string | null
          start_time: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: string
          end_time?: string
          id?: string
          professional_id?: string | null
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_professional_schedules_professional"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_earnings"
            referencedColumns: ["professional_id"]
          },
          {
            foreignKeyName: "fk_professional_schedules_professional"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          alias_name: string | null
          commission_percentage: number
          created_at: string | null
          email: string | null
          first_name: string
          id: string
          is_active: boolean | null
          last_name: string
          notes: string | null
          phone: string | null
          profile_image_url: string | null
          updated_at: string | null
        }
        Insert: {
          alias_name?: string | null
          commission_percentage: number
          created_at?: string | null
          email?: string | null
          first_name: string
          id?: string
          is_active?: boolean | null
          last_name: string
          notes?: string | null
          phone?: string | null
          profile_image_url?: string | null
          updated_at?: string | null
        }
        Update: {
          alias_name?: string | null
          commission_percentage?: number
          created_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_name?: string
          notes?: string | null
          phone?: string | null
          profile_image_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      service_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string | null
          description: string | null
          duration: number
          id: string
          is_active: boolean | null
          name: string
          price: number
          professional_commission_percentage: number | null
          requires_two_professionals: boolean | null
          service_category_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration: number
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          professional_commission_percentage?: number | null
          requires_two_professionals?: boolean | null
          service_category_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration?: number
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          professional_commission_percentage?: number | null
          requires_two_professionals?: boolean | null
          service_category_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_services_service_category"
            columns: ["service_category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      daily_revenue: {
        Row: {
          date: string | null
          net_revenue: number | null
          total_appointments: number | null
          total_commission_paid: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
      marketing_performance: {
        Row: {
          channel_id: string | null
          channel_name: string | null
          month: number | null
          total_appointments: number | null
          total_revenue: number | null
          year: number | null
        }
        Relationships: []
      }
      professional_earnings: {
        Row: {
          first_name: string | null
          last_name: string | null
          month: string | null
          payment_status: string | null
          professional_id: string | null
          total_appointments: number | null
          total_earnings: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_importable_columns: {
        Args: { table_name: string }
        Returns: string[]
      }
      get_marketing_performance_combined: {
        Args: Record<PropertyKey, never>
        Returns: {
          channel_id: string
          channel_name: string
          total_appointments: number
          total_revenue: number
          month: number
          year: number
        }[]
      }
      get_table_columns: {
        Args: { table_name: string }
        Returns: string[]
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
