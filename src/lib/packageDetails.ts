export function serializePackageTypes(types: readonly string[], customType: string): string {
  return [...new Set(types.map(type => type === 'Other' ? customType.trim() || 'Other' : type))].join(', ');
}

const PACKAGE_TYPE_KEYWORDS: Record<string, readonly string[]> = {
  Clothing: [
    'clothing', 'clothes', 'outfit', 'attire', 'wear', 'uniform', 'jersey',
    'dress', 'dresses', 'gown', 'gowns', 'maxi', 'midi', 'mini', 'dera', 'deras', 'kaftan', 'abaya', 'kitenge', 'ankara',
    'jeans', 'mummy jeans', 'mom jeans', 'denim', 'trouser', 'trousers', 'pants', 'leggings', 'joggers', 'sweatpants', 'shorts', 'short', 'skirt', 'skirts', 'skort', 'palazzo', 'culottes', 'cargo',
    'shirt', 'shirts', 't-shirt', 't-shirts', 'tshirt', 'tshirts', 'tee', 'tees', 'blouse', 'blouses', 'top', 'tops', 'crop top', 'camisole', 'bodysuit', 'polo', 'vest', 'vests', 'tank',
    'jacket', 'jackets', 'coat', 'coats', 'blazer', 'blazers', 'hoodie', 'hoodies', 'sweater', 'sweaters', 'cardigan', 'cardigans', 'pullover', 'jumper', 'trench', 'bomber', 'windbreaker',
    'suit', 'suits', 'jumpsuit', 'jumpsuits', 'romper', 'rompers', 'tracksuit', 'two piece', '2 piece', 'lingerie', 'bra', 'bras', 'panties', 'boxers', 'underwear', 'socks', 'pajama', 'pajamas', 'pyjama', 'pyjamas', 'nightdress', 'swimsuit', 'bikini', 'scarf', 'scarves', 'shawl', 'towel', 'towels',
  ],
  Shoes: [
    'shoe', 'shoes', 'footwear', 'sneaker', 'sneakers', 'trainer', 'trainers', 'kicks',
    'airforce', 'jordan', 'jordans', 'yeezy', 'nike', 'adidas', 'puma', 'vans', 'converse', 'timberland',
    'heel', 'heels', 'stiletto', 'stilettos', 'wedge', 'wedges', 'pump', 'pumps', 'block heel',
    'sandal', 'sandals', 'slide', 'slides', 'slipper', 'slippers', 'crocs', 'flip flop', 'flip flops', 'open shoes',
    'boot', 'boots', 'ankle boots', 'chelsea', 'loafer', 'loafers', 'moccasin', 'moccasins', 'oxfords', 'brogues', 'flat', 'flats', 'doll shoes', 'ballet', 'espadrille', 'clogs', 'rubber', 'rubbers', 'official shoes', 'school shoes',
  ],
  Utensils: [
    'utensil', 'utensils', 'kitchen', 'kitchenware', 'cookware', 'dinnerware', 'cutlery',
    'sufuria', 'sufurias', 'pot', 'pots', 'pan', 'pans', 'frying pan', 'nonstick', 'non-stick', 'wok', 'kettle', 'kettles', 'flask', 'flasks', 'thermos', 'hotpot', 'hot pot', 'casserole', 'pressure cooker',
    'plate', 'plates', 'bowl', 'bowls', 'cup', 'cups', 'mug', 'mugs', 'tumbler', 'tumblers', 'glass', 'glasses', 'jug', 'jugs', 'pitcher', 'tray', 'trays', 'serving', 'dish', 'dishes',
    'spoon', 'spoons', 'fork', 'forks', 'knife', 'knives', 'ladle', 'spatula', 'whisk', 'peeler', 'grater', 'strainer', 'colander', 'chopping board', 'rolling pin',
    'lunchbox', 'lunch box', 'tupperware', 'container', 'containers', 'jar', 'jars', 'spice rack', 'dish rack', 'blender', 'mixer', 'toaster', 'air fryer', 'airfryer', 'microwave',
  ],
  Electronics: [
    'electronic', 'electronics', 'gadget', 'gadgets', 'tech', 'device',
    'phone', 'phones', 'iphone', 'iphones', 'samsung', 'tecno', 'infinix', 'xiaomi', 'redmi', 'oppo', 'realme', 'nokia', 'smartphone', 'tablet', 'ipad',
    'laptop', 'laptops', 'macbook', 'computer', 'pc', 'monitor', 'keyboard', 'mouse', 'printer', 'router', 'wifi', 'modem', 'hard drive', 'ssd', 'flash disk', 'usb',
    'charger', 'chargers', 'cable', 'cables', 'cord', 'adapter', 'power bank', 'powerbank', 'extension', 'socket', 'battery', 'batteries',
    'earphone', 'earphones', 'earbuds', 'airpods', 'headphone', 'headphones', 'headset', 'speaker', 'speakers', 'bluetooth', 'soundbar', 'woofer', 'subwoofer', 'radio', 'mic', 'microphone', 'ring light', 'ringlight', 'tripod',
    'tv', 'television', 'smart tv', 'decoder', 'camera', 'smartwatch', 'smart watch', 'playstation', 'ps4', 'ps5', 'xbox', 'console', 'iron box', 'hair dryer', 'blow dry', 'flat iron', 'shaver', 'trimmer', 'clipper',
  ],
  Furniture: [
    'furniture', 'chair', 'chairs', 'seat', 'seats', 'stool', 'stools', 'bench', 'benches', 'sofa', 'couch', 'ottoman', 'recliner',
    'table', 'tables', 'desk', 'desks', 'coffee table', 'dining', 'side table', 'nightstand', 'bedside',
    'bed', 'beds', 'mattress', 'mattresses', 'bunk', 'headboard', 'wardrobe', 'closet', 'cabinet', 'cabinets', 'cupboard', 'drawer', 'drawers', 'dresser', 'shelf', 'shelves', 'bookshelf', 'shoe rack', 'tv stand', 'mirror stand',
  ],
  'Beauty Products': [
    'beauty', 'cosmetic', 'cosmetics', 'makeup', 'make-up', 'skincare', 'skin care', 'haircare', 'hair care',
    'lotion', 'lotions', 'cream', 'creams', 'moisturizer', 'serum', 'serums', 'toner', 'cleanser', 'face wash', 'scrub', 'exfoliator', 'sunscreen', 'spf', 'vaseline', 'essential oil', 'castor oil', 'shea butter',
    'lipstick', 'lip gloss', 'lipgloss', 'lip balm', 'mascara', 'eyeliner', 'eyeshadow', 'foundation', 'concealer', 'powder', 'blush', 'primer', 'setting spray', 'highlighter', 'bronzer', 'brow', 'eyebrow', 'nail polish', 'manicure', 'pedicure', 'acrylic',
    'perfume', 'perfumes', 'cologne', 'fragrance', 'body mist', 'bodymist', 'deodorant', 'roll on', 'scent',
    'wig', 'wigs', 'weave', 'weaves', 'braids', 'braiding', 'shampoo', 'conditioner', 'leave-in', 'edge control', 'bonnet', 'soap', 'shower gel', 'body wash',
  ],
  Accessories: [
    'accessory', 'accessories', 'jewelry', 'jewellery',
    'watch', 'watches', 'wrist watch', 'bracelet', 'bracelets', 'bangle', 'bangles', 'necklace', 'necklaces', 'chain', 'chains', 'pendant', 'choker', 'earring', 'earrings', 'stud', 'studs', 'ring', 'rings', 'anklet', 'brooch',
    'sunglasses', 'shades', 'eyewear', 'spectacles',
    'belt', 'belts', 'buckle', 'tie', 'ties', 'bowtie', 'cufflinks', 'hat', 'hats', 'cap', 'caps', 'beanie', 'beret', 'fascinator', 'headband', 'hairclip', 'scrunchie', 'keychain', 'keyring', 'phone case', 'screen protector',
  ],
  Bags: [
    'bag', 'bags', 'handbag', 'handbags', 'tote', 'tote bag', 'shoulder bag', 'crossbody', 'sling bag', 'clutch', 'purse', 'purses', 'wallet', 'wallets', 'cardholder',
    'backpack', 'backpacks', 'rucksack', 'school bag', 'laptop bag', 'travel bag', 'duffel', 'duffle', 'suitcase', 'luggage', 'trolley', 'briefcase', 'satchel', 'fanny pack', 'waist bag', 'pouch', 'cosmetic bag', 'diaper bag', 'gym bag',
  ],
  'Home Decor': [
    'decor', 'home decor', 'decoration', 'decorations', 'ornament',
    'curtain', 'curtains', 'drape', 'drapes', 'sheer', 'sheers', 'blind', 'blinds',
    'carpet', 'carpets', 'rug', 'rugs', 'mat', 'mats', 'doormat',
    'bedsheet', 'bedsheets', 'bed sheet', 'bed sheets', 'duvet', 'duvets', 'blanket', 'blankets', 'pillow', 'pillows', 'pillowcase', 'cushion', 'cushions', 'throw', 'throws', 'bedcover', 'comforter', 'quilt', 'mosquito net',
    'vase', 'vases', 'flower', 'flowers', 'planter', 'pottery', 'photo frame', 'wall art', 'painting', 'canvas', 'poster', 'wall clock', 'candle', 'candles', 'diffuser', 'lamp', 'lampshade', 'chandelier', 'lantern', 'tablecloth', 'table cloth', 'placemat', 'mirror',
  ],
};

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Compound phrases where a word like "laptop" or "phone" describes a bag/accessory,
 * not an electronic device itself.
 */
const NON_ELECTRONIC_QUALIFIER = '(?!\\s+(?:bag|bags|backpack|backpacks|case|cases|cover|covers|sleeve|sleeves|pouch|pouches|screen\\s+protector))';

function buildCategoryRegex(category: string, keywords: readonly string[]): RegExp {
  const parts = keywords.map((kw) => {
    const escaped = escapeRegExp(kw);
    if (category === 'Electronics' && /^(?:phone|phones|iphone|iphones|laptop|laptops|tablet|ipad)$/i.test(kw)) {
      return `${escaped}${NON_ELECTRONIC_QUALIFIER}`;
    }
    return escaped;
  });
  return new RegExp(`\\b(?:${parts.join('|')})\\b`, 'i');
}

const COMPILED_PACKAGE_MATCHERS: Array<{ category: string; regex: RegExp }> = Object.entries(
  PACKAGE_TYPE_KEYWORDS,
).map(([category, keywords]) => ({
  category,
  regex: buildCategoryRegex(category, keywords),
}));

/**
 * Infers one or more package type categories from a free-text description.
 * Falls back to ['Other'] when no known keywords match.
 */
export function inferPackageTypesFromDescription(description: string): string[] {
  const text = description.trim();
  if (!text) return ['Other'];

  const matched = COMPILED_PACKAGE_MATCHERS
    .filter(({ regex }) => regex.test(text))
    .map(({ category }) => category);

  return matched.length > 0 ? matched : ['Other'];
}
