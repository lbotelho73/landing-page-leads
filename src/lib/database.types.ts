
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      professionals: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          first_name: string
          last_name: string
          email: string | null
          phone: string | null
          commission_percentage: number
          is_active: boolean
          profile_image_url: string | null
          notes: string | null
          alias_name: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          first_name: string
          last_name: string
          email?: string | null
          phone?: string | null
          commission_percentage: number
          is_active?: boolean
          profile_image_url?: string | null
          notes?: string | null
          alias_name?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          first_name?: string
          last_name?: string
          email?: string | null
          phone?: string | null
          commission_percentage?: number
          is_active?: boolean
          profile_image_url?: string | null
          notes?: string | null
          alias_name?: string | null
        }
      }
      professional_schedules: {
        Row: {
          id: string
          professional_id: string
          day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
          start_time: string
          end_time: string
        }
        Insert: {
          id?: string
          professional_id: string
          day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
          start_time: string
          end_time: string
        }
        Update: {
          id?: string
          professional_id?: string
          day_of_week?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
          start_time?: string
          end_time?: string
        }
      }
      services: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          description: string | null
          duration: number
          price: number
          requires_two_professionals: boolean
          is_active: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          description?: string | null
          duration: number
          price: number
          requires_two_professionals?: boolean
          is_active?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          description?: string | null
          duration?: number
          price?: number
          requires_two_professionals?: boolean
          is_active?: boolean
        }
      }
      payment_methods: {
        Row: {
          id: string
          name: string
          additional_fee_percentage: number
          is_active: boolean
        }
        Insert: {
          id?: string
          name: string
          additional_fee_percentage?: number
          is_active?: boolean
        }
        Update: {
          id?: string
          name?: string
          additional_fee_percentage?: number
          is_active?: boolean
        }
      }
      service_payment_methods: {
        Row: {
          service_id: string
          payment_method_id: string
        }
        Insert: {
          service_id: string
          payment_method_id: string
        }
        Update: {
          service_id?: string
          payment_method_id?: string
        }
      }
      customers: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          first_name: string
          last_name: string
          whatsapp_number: string | null
          allows_whatsapp: boolean
          referral_source: string | null
          notes: string | null
          numeric_id: number
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          first_name: string
          last_name: string
          whatsapp_number?: string | null
          allows_whatsapp?: boolean
          referral_source?: string | null
          notes?: string | null
          numeric_id?: number
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          first_name?: string
          last_name?: string
          whatsapp_number?: string | null
          allows_whatsapp?: boolean
          referral_source?: string | null
          notes?: string | null
          numeric_id?: number
        }
      }
      marketing_channels: {
        Row: {
          id: string
          name: string
          description: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          is_active?: boolean
        }
      }
      appointments: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          date: string
          time: string
          customer_id: string | null
          service_id: string | null
          primary_professional_id: string | null
          secondary_professional_id: string | null
          service_duration: number
          service_price: number
          payment_method_id: string | null
          has_discount: boolean
          discount_percentage: number
          final_price: number
          notes: string | null
          is_completed: boolean
          cancellation_reason: string | null
          marketing_channel_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          date: string
          time: string
          customer_id?: string | null
          service_id?: string | null
          primary_professional_id?: string | null
          secondary_professional_id?: string | null
          service_duration: number
          service_price: number
          payment_method_id?: string | null
          has_discount?: boolean
          discount_percentage?: number
          final_price: number
          notes?: string | null
          is_completed?: boolean
          cancellation_reason?: string | null
          marketing_channel_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          date?: string
          time?: string
          customer_id?: string | null
          service_id?: string | null
          primary_professional_id?: string | null
          secondary_professional_id?: string | null
          service_duration?: number
          service_price?: number
          payment_method_id?: string | null
          has_discount?: boolean
          discount_percentage?: number
          final_price?: number
          notes?: string | null
          is_completed?: boolean
          cancellation_reason?: string | null
          marketing_channel_id?: string | null
        }
      }
      professional_payments: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          appointment_id: string
          professional_id: string
          commission_percentage: number
          amount: number
          payment_status: string
          payment_date: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          appointment_id: string
          professional_id: string
          commission_percentage: number
          amount: number
          payment_status?: string
          payment_date?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          appointment_id?: string
          professional_id?: string
          commission_percentage?: number
          amount?: number
          payment_status?: string
          payment_date?: string | null
          notes?: string | null
        }
      }
    }
    Views: {
      professional_earnings: {
        Row: {
          professional_id: string | null
          first_name: string | null
          last_name: string | null
          payment_status: string | null
          total_earnings: number | null
          total_appointments: number | null
          month: string | null
        }
      }
      marketing_performance: {
        Row: {
          channel_id: string | null
          channel_name: string | null
          total_appointments: number | null
          total_revenue: number | null
          month: number | null
          year: number | null
        }
      }
      daily_revenue: {
        Row: {
          date: string | null
          total_appointments: number | null
          total_revenue: number | null
          total_commission_paid: number | null
          net_revenue: number | null
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
    }
  }
}
