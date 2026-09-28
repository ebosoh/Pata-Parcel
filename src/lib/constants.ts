// Package types for the dispatch form
export const PACKAGE_TYPES = [
  'Clothing',
  'Shoes',
  'Utensils',
  'Electronics',
  'Furniture',
  'Beauty Products',
  'Accessories',
  'Bags',
  'Home Decor',
  'Other',
] as const;

// Business types for seller profiles
export const BUSINESS_TYPES = [
  'Fashion',
  'Utensils',
  'Electronics',
  'Furniture',
  'Beauty & Cosmetics',
  'Shoes',
  'Accessories',
  'Home & Living',
  'Mixed/General',
  'Other',
] as const;

// Sending methods
export const SENDING_METHODS = [
  { value: 'pickup_mtaani', label: 'Pick-up Mtaani' },
  { value: 'pata_parcel', label: 'Pata Parcel (PAP Pick-up Points)' },
  { value: 'door_to_door', label: 'Door to Door (Within Nairobi)' },
  { value: 'psv', label: 'PSV (SACCO)' },
] as const;

// Platform fee per package in KES
export const PLATFORM_FEE_PER_PACKAGE = 10;

// Tracking stages for progress bar
export const TRACKING_STAGES = [
  { key: 'dispatched_to_pap', label: 'Dispatched to PAP', step: 1 },
  { key: 'sorting', label: 'Sorting', step: 2 },
  { key: 'on_transit', label: 'On Transit', step: 3 },
  { key: 'delivered', label: 'Delivered', step: 4 },
] as const;

// Kenyan phone number regex (07XX or 01XX, 10 digits)
export const KENYAN_PHONE_REGEX = /^(07|01)\d{8}$/;

// Validate Kenyan phone number
export function isValidKenyanPhone(phone: string): boolean {
  return KENYAN_PHONE_REGEX.test(phone.replace(/\s/g, ''));
}

// Format phone for display: 0712 345 678
export function formatPhoneDisplay(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 10) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
  }
  return phone;
}
