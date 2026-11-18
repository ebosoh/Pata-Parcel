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

// All Kenyan destination towns
export const KENYAN_TOWNS = [
  'Mombasa',
  'Kwale',
  'Ukunda',
  'Msambweni',
  'Kinango',
  'Lunga Lunga',
  'Kilifi',
  'Malindi',
  'Kaloleni',
  'Mariakani',
  'Hola',
  'Garsen',
  'Lamu',
  'Mwatate',
  'Taveta',
  'Mitto Andei',
  'Garissa',
  'Masalani',
  'Ijara',
  'Dadaab',
  'Bura East',
  'Wajir',
  'Habaswein',
  'Mandera',
  'El Wak',
  'Takaba',
  'Rhamu',
  'Marsabit',
  'Moyale',
  'Sololo',
  'Loiyangalani',
  'Isiolo',
  'Garbatulla',
  'Merti',
  'Meru',
  'Maua',
  'Nkubu',
  'Kathwana',
  'Embu',
  'Siakago',
  'Runyenjes',
  'Kitui',
  'Mwingi',
  'Machakos',
  'Kangundo-Tala',
  'Mavoko (Athi River)',
  'Matuu',
  'Kathiani',
  'Wote',
  'Makindu',
  'Emali',
  'Sultan Hamud',
  'Kibwezi',
  'Ol Kalou',
  'Nyeri',
  'Karatina',
  'Othaya',
  'Naro Moru',
  'Kerugoya',
  'Kutus',
  'Kagumo',
  'Kianyaga',
  "Murang'a",
  'Kenol',
  'Kangema',
  'Maragua',
  'Kangari',
  'Kiambu',
  'Thika',
  'Ruiru',
  'Kikuyu',
  'Limuru',
  'Juja',
  'Githunguri',
  'Gatundu',
  'Lodwar',
  'Lokichogio',
  'Kapenguria',
  'Kacheliba',
  'Maralal',
  'Baragoi',
  'Kitale',
  'Endebess',
  'Cherangany',
  'Eldoret',
  'Moiben',
  'Iten',
  'Kapsowar',
  'Kapsabet',
  'Nandi Hills',
  'Kabiyet',
  'Kabarnet',
  'Eldama Ravine',
  'Mogotio',
  'Marigat',
  'Nanyuki',
  'Nyahururu',
  'Rumuruti',
  'Nakuru',
  'Naivasha',
  'Gilgil',
  'Molo',
  'Bahati',
  'Narok',
  'Kilgoris',
  'Kajiado',
  'Ngong',
  'Namanga',
  'Kericho',
  'Londiani',
  'Chepsion',
  'Bomet',
  'Kakamega',
  'Mumias',
  'Butere',
  'Malava',
  'Mbale (Vihiga)',
  'Bungoma',
  'Webuye',
  'Kimilili',
  'Chwele',
  'Busia',
  'Malaba',
  'Siaya',
  'Bondo',
  'Ugunja',
  'Ukwala',
  'Yala',
  'Usenge',
  'Kisumu',
  'Ahero',
  'Muhoroni',
  'Chemelli',
  'Maseno',
  'Awasi',
  'Homa Bay',
  'Oyugis',
  'Mbita',
  'Kendu Bay',
  'Rodi Kopany',
  'Migori',
  'Rongo',
  'Kehancha',
  'Kisii',
  'Ogembo',
  'Keroka',
  'Kenyenya',
  'Tabaka',
  'Nyamira',
] as const;

// Destination towns list including Nairobi
export const DESTINATION_TOWNS = [
  'Nairobi',
  ...KENYAN_TOWNS,
];

// Helper to filter destination towns by query
export function filterTowns(query: string, townsList: readonly string[] | string[] = DESTINATION_TOWNS): string[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return [...townsList];
  
  const startsWith: string[] = [];
  const contains: string[] = [];
  
  for (const town of townsList) {
    const lower = town.toLowerCase();
    if (lower.startsWith(clean)) {
      startsWith.push(town);
    } else if (lower.includes(clean)) {
      contains.push(town);
    }
  }
  
  return [...startsWith, ...contains];
}

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
