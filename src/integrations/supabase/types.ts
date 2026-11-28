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
      dispatch_drivers: {
        Row: {
          created_at: string
          created_by: string | null
          destination: string | null
          driver_name: string
          driver_phone: string
          id: string
          parcel_id: string | null
          sacco_name: string | null
          vehicle_plate: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          destination?: string | null
          driver_name: string
          driver_phone: string
          id?: string
          parcel_id?: string | null
          sacco_name?: string | null
          vehicle_plate: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          destination?: string | null
          driver_name?: string
          driver_phone?: string
          id?: string
          parcel_id?: string | null
          sacco_name?: string | null
          vehicle_plate?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_drivers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_drivers_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      parcel_receipts: {
        Row: {
          created_at: string
          id: string
          parcel_id: string
          receipt_image_url: string
          shared_with_buyer_at: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          parcel_id: string
          receipt_image_url: string
          shared_with_buyer_at?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string
          id?: string
          parcel_id?: string
          receipt_image_url?: string
          shared_with_buyer_at?: string | null
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
          goods_amount: number | null
          goods_paid: boolean
          id: string
          num_packages: number
          order_source: string
          package_description: string | null
          package_type: string
          payment_code: string | null
          payment_status: string
          pick_point: string | null
          platform_fee: number
          platform_fee_paid: boolean
          product_image_url: string | null
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
          goods_amount?: number | null
          goods_paid?: boolean
          id?: string
          num_packages?: number
          order_source?: string
          package_description?: string | null
          package_type: string
          payment_code?: string | null
          payment_status?: string
          pick_point?: string | null
          platform_fee?: number
          platform_fee_paid?: boolean
          product_image_url?: string | null
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
          goods_amount?: number | null
          goods_paid?: boolean
          id?: string
          num_packages?: number
          order_source?: string
          package_description?: string | null
          package_type?: string
          payment_code?: string | null
          payment_status?: string
          pick_point?: string | null
          platform_fee?: number
          platform_fee_paid?: boolean
          product_image_url?: string | null
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
      payment_code_attempts: {
        Row: {
          code: string | null
          created_at: string
          id: string
          outcome: string
          phone: string
          seller_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          outcome: string
          phone: string
          seller_id: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          outcome?: string
          phone?: string
          seller_id?: string
        }
        Relationships: []
      }
      payment_code_reservations: {
        Row: {
          code: string
          created_at: string
          parcel_id: string
        }
        Insert: {
          code: string
          created_at?: string
          parcel_id: string
        }
        Update: {
          code?: string
          created_at?: string
          parcel_id?: string
        }
        Relationships: []
      }
      payment_fraud_phones: {
        Row: {
          blacklisted_at: string | null
          duplicate_attempts: number
          last_attempt_at: string
          phone: string
        }
        Insert: {
          blacklisted_at?: string | null
          duplicate_attempts?: number
          last_attempt_at?: string
          phone: string
        }
        Update: {
          blacklisted_at?: string | null
          duplicate_attempts?: number
          last_attempt_at?: string
          phone?: string
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
          order_link_code: string
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
          order_link_code?: string
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
          order_link_code?: string
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
      admin_delete_parcel: { Args: { _parcel_id: string }; Returns: undefined }
      admin_list_staff: {
        Args: never
        Returns: {
          email: string
          owner_name: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      admin_remove_staff: { Args: { _user_id: string }; Returns: undefined }
      admin_set_staff_role: {
        Args: { _email: string; _role: Database["public"]["Enums"]["app_role"] }
        Returns: undefined
      }
      get_order_seller: {
        Args: { _code: string }
        Returns: {
          business_name: string
          location: string
          owner_name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_pap_staff: { Args: { _uid: string }; Returns: boolean }
      mark_receipt_shared_with_buyer: {
        Args: { p_receipt_id: string }
        Returns: boolean
      }
      normalize_phone: { Args: { _phone: string }; Returns: string }
      resolve_buyer_complaint: {
        Args: { p_complaint_id: string }
        Returns: boolean
      }
      seller_create_parcel: { Args: { _input: Json }; Returns: Json }
      seller_set_parcel_payment: {
        Args: { _fee_status: string; _goods_paid: boolean; _parcel_id: string }
        Returns: undefined
      }
      seller_verify_and_dispatch: {
        Args: { _parcel_id: string }
        Returns: undefined
      }
      submit_buyer_order: {
        Args: {
          _buyer_name: string
          _buyer_phone: string
          _code: string
          _destination: string
          _goods_amount: number
          _package_description: string
          _package_type: string
          _payment_code: string
          _pick_point: string
          _product_image_url?: string
          _psv_sacco: string
          _sending_fee: number
          _sending_method: string
        }
        Returns: string
      }
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
