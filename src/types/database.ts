export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'seller' | 'pap_admin' | 'pap_staff' | 'assistant_staff';
export type SendingMethod = 'pickup_mtaani' | 'pata_parcel' | 'door_to_door' | 'psv' | 'psv_driver';
export type PaymentStatus = 'paid' | 'unpaid' | 'pay_on_delivery';
export type TrackingStatus = 'awaiting_verification' | 'dispatched_to_pap' | 'sorting' | 'on_transit' | 'delivered';
export type ComplaintStatus = 'open' | 'investigating' | 'resolved';

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          business_name: string | null;
          owner_name: string;
          phone: string;
          location: string | null;
          profile_picture_url: string | null;
          order_link_code?: string;
          business_type: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          business_name?: string | null;
          owner_name: string;
          phone: string;
          location?: string | null;
          profile_picture_url?: string | null;
          business_type?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: UserRole;
          business_name?: string | null;
          owner_name?: string;
          phone?: string;
          location?: string | null;
          profile_picture_url?: string | null;
          business_type?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      parcels: {
        Row: {
          id: string;
          reference_number: string;
          seller_id: string;
          buyer_name: string;
          buyer_phone: string;
          destination: string;
          sending_method: SendingMethod;
          psv_sacco: string | null;
          pick_point?: string | null;
          package_type: string;
          num_packages: number;
          package_description?: string | null;
          sending_fee_per_package: number;
          total_sending_fee: number;
          payment_status: PaymentStatus;
          tracking_status: TrackingStatus;
          platform_fee: number;
          platform_fee_paid: boolean;
          goods_amount?: number | null;
          payment_code?: string | null;
          goods_paid?: boolean;
          order_source?: string;
          product_image_url?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reference_number?: string;
          seller_id: string;
          buyer_name: string;
          buyer_phone: string;
          destination: string;
          sending_method: SendingMethod;
          psv_sacco?: string | null;
          pick_point?: string | null;
          package_type: string;
          num_packages?: number;
          package_description?: string | null;
          sending_fee_per_package: number;
          total_sending_fee?: number;
          payment_status?: PaymentStatus;
          tracking_status?: TrackingStatus;
          platform_fee?: number;
          platform_fee_paid?: boolean;
          product_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          reference_number?: string;
          seller_id?: string;
          buyer_name?: string;
          buyer_phone?: string;
          destination?: string;
          sending_method?: SendingMethod;
          psv_sacco?: string | null;
          pick_point?: string | null;
          package_type?: string;
          num_packages?: number;
          package_description?: string | null;
          sending_fee_per_package?: number;
          total_sending_fee?: number;
          payment_status?: PaymentStatus;
          tracking_status?: TrackingStatus;
          platform_fee?: number;
          platform_fee_paid?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      parcel_tracking: {
        Row: {
          id: string;
          parcel_id: string;
          status: TrackingStatus;
          updated_by: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          parcel_id: string;
          status: TrackingStatus;
          updated_by: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          parcel_id?: string;
          status?: TrackingStatus;
          updated_by?: string;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      parcel_receipts: {
        Row: {
          id: string;
          parcel_id: string;
          uploaded_by: string;
          receipt_image_url: string;
          created_at: string;
          shared_with_buyer_at: string | null;
        };
        Insert: {
          id?: string;
          parcel_id: string;
          uploaded_by: string;
          receipt_image_url: string;
          created_at?: string;
          shared_with_buyer_at?: string | null;
        };
        Update: {
          id?: string;
          parcel_id?: string;
          uploaded_by?: string;
          receipt_image_url?: string;
          created_at?: string;
          shared_with_buyer_at?: string | null;
        };
        Relationships: [];
      };
      complaints: {
        Row: {
          id: string;
          parcel_id: string | null;
          seller_id: string;
          buyer_name: string;
          buyer_phone: string;
          destination: string;
          package_type: string;
          issue_description: string;
          status: ComplaintStatus;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          parcel_id?: string | null;
          seller_id: string;
          buyer_name: string;
          buyer_phone: string;
          destination: string;
          package_type: string;
          issue_description: string;
          status?: ComplaintStatus;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          parcel_id?: string | null;
          seller_id?: string;
          buyer_name?: string;
          buyer_phone?: string;
          destination?: string;
          package_type?: string;
          issue_description?: string;
          status?: ComplaintStatus;
          created_at?: string;
          resolved_at?: string | null;
        };
        Relationships: [];
      };
      saccos: {
        Row: {
          id: string;
          name: string;
          route: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          route: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          route?: string;
          is_active?: boolean;
        };
        Relationships: [];
      };
      destinations: {
        Row: {
          id: string;
          name: string;
          region: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          region: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          region?: string;
          is_active?: boolean;
        };
        Relationships: [];
      };
      dispatch_drivers: {
        Row: {
          id: string;
          driver_name: string;
          driver_phone: string;
          vehicle_plate: string;
          sacco_name: string | null;
          destination: string | null;
          parcel_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          driver_name: string;
          driver_phone: string;
          vehicle_plate: string;
          sacco_name?: string | null;
          destination?: string | null;
          parcel_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          driver_name?: string;
          driver_phone?: string;
          vehicle_plate?: string;
          sacco_name?: string | null;
          destination?: string | null;
          parcel_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: { Args: { _user_id: string; _role: 'pap_admin' | 'pap_staff' | 'assistant_staff' }; Returns: boolean };
      admin_update_seller_profile: { Args: { _seller_id: string; _input: Json }; Returns: Json };
      seller_create_parcel: { Args: { _input: Json }; Returns: Json };
      resolve_buyer_complaint: { Args: { p_complaint_id: string }; Returns: boolean };
      mark_receipt_shared_with_buyer: { Args: { p_receipt_id: string }; Returns: boolean };
      get_order_seller: { Args: { _code: string }; Returns: { business_name: string | null; owner_name: string; location: string | null }[] };
      submit_buyer_order: {
        Args: {
          _code: string; _buyer_name: string; _buyer_phone: string; _destination: string; _sending_method: string;
          _psv_sacco: string; _pick_point: string; _package_type: string; _package_description: string;
          _sending_fee: number; _goods_amount: number; _payment_code: string;
          _product_image_url?: string | null;
        };
        Returns: string;
      };
      seller_set_parcel_payment: { Args: { _parcel_id: string; _goods_paid: boolean; _fee_status: string }; Returns: undefined };
      seller_verify_and_dispatch: { Args: { _parcel_id: string }; Returns: undefined };
    };
    Enums: {
      user_role: UserRole;
      sending_method: SendingMethod;
      payment_status: PaymentStatus;
      tracking_status: TrackingStatus;
      complaint_status: ComplaintStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Convenience type aliases
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Parcel = Database['public']['Tables']['parcels']['Row'];
export type ParcelTracking = Database['public']['Tables']['parcel_tracking']['Row'];
export type ParcelReceipt = Database['public']['Tables']['parcel_receipts']['Row'];
export type Complaint = Database['public']['Tables']['complaints']['Row'];
export type Sacco = Database['public']['Tables']['saccos']['Row'];
export type Destination = Database['public']['Tables']['destinations']['Row'];
export type DispatchDriver = Database['public']['Tables']['dispatch_drivers']['Row'];
