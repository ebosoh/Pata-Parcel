export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      complaints: {
        Row: {
          buyer_name: string
          buyer_phone: string
          created_at: string
          destination: string
          id: string
          issue_description: string
          package_type: string
          parcel_id: string | null
          resolved_at: string | null
          seller_id: string
          status: string
        }
        Insert: {
          buyer_name: string
          buyer_phone: string
          created_at?: string
          destination: string
          id?: string
          issue_description: string
          package_type: string
          parcel_id?: string | null
          resolved_at?: string | null
          seller_id: string
          status?: string
        }
        Update: {
          buyer_name?: string
          buyer_phone?: string
          created_at?: string
          destination?: string
          id?: string
          issue_description?: string
          package_type?: string
          parcel_id?: string | null
          resolved_at?: string | null
          seller_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaints_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      destinations: {
        Row: {
          id: string
          is_active: boolean
          name: string
          region: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          name: string
          region?: string
        }
        Update: {
          id?: string
          is_active?: boolean
          name?: string
          region?: string
        }
        Relationships: []
      }
      parcel_receipts: {
        Row: {
          created_at: string
          id: string
          parcel_id: string
          receipt_image_url: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          parcel_id: string
          receipt_image_url: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          id?: string
          parcel_id?: string
          receipt_image_url?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "parcel_receipts_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      parcel_tracking: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          parcel_id: string
          status: string
          updated_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          parcel_id: string
          status: string
          updated_by: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          parcel_id?: string
          status?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "parcel_tracking_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      parcels: {
        Row: {
          buyer_name: string
          buyer_phone: string
          created_at: string
          destination: string
          id: string
          num_packages: number
          package_type: string
          payment_status: string
          platform_fee: number
          platform_fee_paid: boolean
          psv_sacco: string | null
          reference_number: string
          seller_id: string
          sending_fee_per_package: number
          sending_method: string
          total_sending_fee: number
          tracking_status: string
          updated_at: string
        }
        Insert: {
          buyer_name: string
          buyer_phone: string
          created_at?: string
          destination: string
          id?: string
          num_packages?: number
          package_type: string
          payment_status?: string
          platform_fee?: number
          platform_fee_paid?: boolean
          psv_sacco?: string | null
          reference_number?: string
          seller_id: string
          sending_fee_per_package?: number
          sending_method: string
          total_sending_fee?: number
          tracking_status?: string
          updated_at?: string
        }
        Update: {
          buyer_name?: string
          buyer_phone?: string
          created_at?: string
          destination?: string
          id?: string
          num_packages?: number
          package_type?: string
          payment_status?: string
          platform_fee?: number
          platform_fee_paid?: boolean
          psv_sacco?: string | null
          reference_number?: string
          seller_id?: string
          sending_fee_per_package?: number
          sending_method?: string
          total_sending_fee?: number
          tracking_status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          business_name: string | null
          business_type: string | null
          created_at: string
          id: string
          location: string | null
          owner_name: string
          phone: string
          profile_picture_url: string | null
          role: string
          updated_at: string
        }
        Insert: {
          business_name?: string | null
          business_type?: string | null
          created_at?: string
          id: string
          location?: string | null
          owner_name?: string
          phone?: string
          profile_picture_url?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          business_name?: string | null
          business_type?: string | null
          created_at?: string
          id?: string
          location?: string | null
          owner_name?: string
          phone?: string
          profile_picture_url?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      saccos: {
        Row: {
          id: string
          is_active: boolean
          name: string
          route: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          name: string
          route?: string
        }
        Update: {
          id?: string
          is_active?: boolean
          name?: string
          route?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_pap_staff: { Args: { _uid: string }; Returns: boolean }
    }
    Enums: {
      app_role: "pap_admin" | "pap_staff"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["pap_admin", "pap_staff"],
    },
  },
} as const
