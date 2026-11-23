export interface SellerProfileItem {
  id: string;
  owner_name: string;
  business_name?: string | null;
  phone: string;
  business_type?: string | null;
  location?: string | null;
  order_link_code?: string;
  profile_picture_url?: string | null;
  role?: string;
  created_at: string;
  totalParcels?: number;
  deliveredParcels?: number;
  totalSendingFee?: number;
}

export type SellerSortOption =
  | 'name_asc'
  | 'name_desc'
  | 'business_asc'
  | 'business_desc'
  | 'parcels_desc'
  | 'parcels_asc'
  | 'date_desc'
  | 'date_asc';

export function getSellerDisplayName(seller: { owner_name?: string | null; business_name?: string | null }): string {
  const business = seller.business_name?.trim();
  const owner = seller.owner_name?.trim();
  if (business && owner) return `${business} (${owner})`;
  if (business) return business;
  if (owner) return owner;
  return 'Unnamed Seller';
}

export function matchesSellerDirectoryQuery(seller: SellerProfileItem, query: string): boolean {
  const clean = query.trim().toLowerCase();
  if (!clean) return true;

  const owner = (seller.owner_name || '').toLowerCase();
  const business = (seller.business_name || '').toLowerCase();
  const phone = (seller.phone || '').toLowerCase();
  const loc = (seller.location || '').toLowerCase();
  const type = (seller.business_type || '').toLowerCase();
  const code = (seller.order_link_code || '').toLowerCase();

  return (
    owner.includes(clean) ||
    business.includes(clean) ||
    phone.includes(clean) ||
    loc.includes(clean) ||
    type.includes(clean) ||
    code.includes(clean)
  );
}

export function filterSellers(
  sellers: SellerProfileItem[],
  options: {
    query?: string;
    businessType?: string;
    activity?: 'all' | 'active' | 'inactive';
  },
): SellerProfileItem[] {
  const { query = '', businessType = 'all', activity = 'all' } = options;

  return sellers.filter((seller) => {
    if (!matchesSellerDirectoryQuery(seller, query)) return false;

    if (businessType !== 'all' && seller.business_type !== businessType) {
      return false;
    }

    if (activity === 'active' && (seller.totalParcels ?? 0) === 0) {
      return false;
    }

    if (activity === 'inactive' && (seller.totalParcels ?? 0) > 0) {
      return false;
    }

    return true;
  });
}

export function sortSellers(
  sellers: SellerProfileItem[],
  sortBy: SellerSortOption,
): SellerProfileItem[] {
  return [...sellers].sort((a, b) => {
    switch (sortBy) {
      case 'name_asc': {
        const nameA = (a.owner_name || '').toLowerCase();
        const nameB = (b.owner_name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      }
      case 'name_desc': {
        const nameA = (a.owner_name || '').toLowerCase();
        const nameB = (b.owner_name || '').toLowerCase();
        return nameB.localeCompare(nameA);
      }
      case 'business_asc': {
        const busA = (a.business_name || a.owner_name || '').toLowerCase();
        const busB = (b.business_name || b.owner_name || '').toLowerCase();
        return busA.localeCompare(busB);
      }
      case 'business_desc': {
        const busA = (a.business_name || a.owner_name || '').toLowerCase();
        const busB = (b.business_name || b.owner_name || '').toLowerCase();
        return busB.localeCompare(busA);
      }
      case 'parcels_desc':
        return (b.totalParcels ?? 0) - (a.totalParcels ?? 0);
      case 'parcels_asc':
        return (a.totalParcels ?? 0) - (b.totalParcels ?? 0);
      case 'date_desc':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'date_asc':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      default:
        return 0;
    }
  });
}
