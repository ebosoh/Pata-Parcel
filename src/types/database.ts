export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'seller' | 'pap_admin' | 'pap_staff';
export type SendingMethod = 'pickup_mtaani' | 'pata_parcel' | 'door_to_door' | 'psv';
export type PaymentStatus = 'paid' | 'unpaid' | 'pay_on_delivery';
export type TrackingStatus = 'dispatched_to_pap' | 'sorting' | 'on_transit' | 'delivered';
export type ComplaintStatus = 'open' | 'investigating' | 'resolved';

export interface Database {
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
          business_type: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
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
          package_type: string;
          num_packages: number;
          sending_fee_per_package: number;
          total_sending_fee: number;
          payment_status: PaymentStatus;
          tracking_status: TrackingStatus;
          platform_fee: number;
          platform_fee_paid: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['parcels']['Row'], 'id' | 'reference_number' | 'total_sending_fee' | 'platform_fee' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['parcels']['Insert']>;
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
        Insert: Omit<Database['public']['Tables']['parcel_tracking']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['parcel_tracking']['Insert']>;
      };
      parcel_receipts: {
        Row: {
          id: string;
          parcel_id: string;
          uploaded_by: string;
          receipt_image_url: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['parcel_receipts']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['parcel_receipts']['Insert']>;
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
        Insert: Omit<Database['public']['Tables']['complaints']['Row'], 'id' | 'created_at' | 'resolved_at'>;
        Update: Partial<Database['public']['Tables']['complaints']['Insert']>;
      };
      saccos: {
        Row: {
          id: string;
          name: string;
          route: string;
          is_active: boolean;
        };
        Insert: Omit<Database['public']['Tables']['saccos']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['saccos']['Insert']>;
      };
      destinations: {
        Row: {
          id: string;
          name: string;
          region: string;
          is_active: boolean;
        };
        Insert: Omit<Database['public']['Tables']['destinations']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['destinations']['Insert']>;
      };
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
