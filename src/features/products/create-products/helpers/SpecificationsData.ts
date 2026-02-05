import z from "zod";

export const baseSchema = z.object({
  imageUrl: z.string().url("Must be a valid URL").optional(),
  description: z.string().optional(),
  sku: z.string().optional(),
  tags: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
});

// Home Appliances Schema
export const homeApplianceSchema = baseSchema.extend({
  brand: z.string().optional(),
  modelNumber: z.string().optional(),
  capacity: z.string().optional(),
  energyRating: z.string().optional(),
  features: z.string().optional(),
  dimensions: z.string().optional(),
  weight: z.string().optional(),
  warrantySummary: z.string().optional(),
  salesPackage: z.string().optional(),
});

// Sports & Fitness Schema
export const sportsFitnessSchema = baseSchema.extend({
  brand: z.string().optional(),
  productType: z.string().optional(),
  material: z.string().optional(),
  weightCapacity: z.string().optional(),
  features: z.string().optional(),
  dimensions: z.string().optional(),
  weight: z.string().optional(),
  warrantySummary: z.string().optional(),
  salesPackage: z.string().optional(),
});

// Headphones Schema
export const headphonesSchema = baseSchema.extend({
  brand: z.string().optional(),
  modelNumber: z.string().optional(),
  type: z.string().optional(),
  connectivity: z.string().optional(),
  batteryLife: z.string().optional(),
  noiseCancellation: z.string().optional(),
  waterResistance: z.string().optional(),
  features: z.string().optional(),
  dimensions: z.string().optional(),
  weight: z.string().optional(),
  warrantySummary: z.string().optional(),
  salesPackage: z.string().optional(),
});

// Beauty & Skincare Schema
export const beautySkincareSchema = baseSchema.extend({
  brand: z.string().optional(),
  productType: z.string().optional(),
  skinType: z.string().optional(),
  keyIngredients: z.string().optional(),
  volume: z.string().optional(),
  usageInstructions: z.string().optional(),
  features: z.string().optional(),
  shelfLife: z.string().optional(),
  warrantySummary: z.string().optional(),
});

// Men's Shoes Schema
export const mensShoesSchema = baseSchema.extend({
  brand: z.string().optional(),
  modelNumber: z.string().optional(),
  shoeType: z.string().optional(),
  material: z.string().optional(),
  soleMaterial: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  features: z.string().optional(),
  dimensions: z.string().optional(),
  weight: z.string().optional(),
  warrantySummary: z.string().optional(),
  salesPackage: z.string().optional(),
});

// T-Shirts Schema
export const tShirtsSchema = baseSchema.extend({
  brand: z.string().optional(),
  modelNumber: z.string().optional(),
  fabric: z.string().optional(),
  fit: z.string().optional(),
  neckStyle: z.string().optional(),
  sleeveLength: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  features: z.string().optional(),
  careInstructions: z.string().optional(),
  warrantySummary: z.string().optional(),
});

// Smartphones Schema (matches fieldConfig)
export const smartphoneSchema = baseSchema.extend({
  brand: z.string().optional(),
  modelNumber: z.string().optional(),
  displaySize: z.string().optional(),
  screenResolution: z.string().optional(),
  screenType: z.string().optional(),
  processor: z.string().optional(),
  ram: z.string().optional(),
  internalStorage: z.string().optional(),
  expandableStorage: z.string().optional(),
  primaryCamera: z.string().optional(),
  secondaryCamera: z.string().optional(),
  networkType: z.string().optional(),
  wifi: z.string().optional(),
  bluetooth: z.string().optional(),
  gps: z.string().optional(),
  batteryCapacity: z.string().optional(),
  charging: z.string().optional(),
  dimensions: z.string().optional(),
  weight: z.string().optional(),
  warrantySummary: z.string().optional(),
});

// Laptops Schema (matches fieldConfig)
export const laptopSchema = baseSchema.extend({
  brand: z.string().optional(),
  modelNumber: z.string().optional(),
  displaySize: z.string().optional(),
  screenResolution: z.string().optional(),
  screenRefreshRate: z.string().optional(),
  processor: z.string().optional(),
  processorGeneration: z.string().optional(),
  ram: z.string().optional(),
  storage: z.string().optional(),
  graphics: z.string().optional(),
  wifi: z.string().optional(),
  bluetooth: z.string().optional(),
  ports: z.string().optional(),
  batteryBackup: z.string().optional(),
  dimensions: z.string().optional(),
  weight: z.string().optional(),
  warrantySummary: z.string().optional(),
});

// Watches Schema
export const watchesSchema = baseSchema.extend({
  brand: z.string().optional(),
  modelNumber: z.string().optional(),
  watchType: z.string().optional(),
  caseMaterial: z.string().optional(),
  bandMaterial: z.string().optional(),
  dialColor: z.string().optional(),
  waterResistance: z.string().optional(),
  features: z.string().optional(),
  batteryLife: z.string().optional(),
  dimensions: z.string().optional(),
  weight: z.string().optional(),
  warrantySummary: z.string().optional(),
  salesPackage: z.string().optional(),
});

// Women's Dresses Schema
export const womensDressesSchema = baseSchema.extend({
  brand: z.string().optional(),
  modelNumber: z.string().optional(),
  dressType: z.string().optional(),
  fabric: z.string().optional(),
  sleeveLength: z.string().optional(),
  neckline: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  features: z.string().optional(),
  careInstructions: z.string().optional(),
  warrantySummary: z.string().optional(),
});

// Electronics Schema
export const electronicsSchema = baseSchema.extend({
  brand: z.string().optional(),
  modelNumber: z.string().optional(),
  productType: z.string().optional(),
  connectivity: z.string().optional(),
  powerSource: z.string().optional(),
  batteryLife: z.string().optional(),
  features: z.string().optional(),
  dimensions: z.string().optional(),
  weight: z.string().optional(),
  warrantySummary: z.string().optional(),
  salesPackage: z.string().optional(),
});

// LED TV Schema (updated to match fieldConfig fields where applicable)
export const ledTvSchema = baseSchema.extend({
  brand: z.string().optional(),
  modelNumber: z.string().optional(),
  displaySize: z.string().optional(),
  screenResolution: z.string().optional(),
  screenType: z.string().optional(),
  hdType: z.string().optional(),
  hdStandard: z.string().optional(),
  numberOfColors: z.string().optional(),
  maxRefreshRate: z.string().optional(),
  aspectRatio: z.string().optional(),
  contrastRatio: z.string().optional(),
  responseTime: z.string().optional(),
  brightness: z.string().optional(),
  colorGamut: z.string().optional(),
  hdmiPorts: z.string().optional(),
  usbPorts: z.string().optional(),
  ethernetPort: z.string().optional(),
  wifi: z.string().optional(),
  bluetooth: z.string().optional(),
  dimensions: z.string().optional(),
  weight: z.string().optional(),
  features: z.string().optional(),
  warrantySummary: z.string().optional(),
  salesPackage: z.string().optional(),
});

// Smart TV Schema (updated to match fieldConfig fields where applicable)
export const smartTvSchema = baseSchema.extend({
  brand: z.string().optional(),
  modelNumber: z.string().optional(),
  displaySize: z.string().optional(),
  screenResolution: z.string().optional(),
  screenType: z.string().optional(),
  operatingSystem: z.string().optional(),
  appsSupported: z.string().optional(),
  voiceAssistant: z.string().optional(),
  wifi: z.string().optional(),
  ethernet: z.string().optional(),
  bluetooth: z.string().optional(),
  hdmiPorts: z.string().optional(),
  usbPorts: z.string().optional(),
  dimensions: z.string().optional(),
  weight: z.string().optional(),
  features: z.string().optional(),
  warrantySummary: z.string().optional(),
  salesPackage: z.string().optional(),
});

// Desktop PC Schema (updated to match fieldConfig fields where applicable)
export const desktopPcSchema = baseSchema.extend({
  brand: z.string().optional(),
  modelNumber: z.string().optional(),
  processor: z.string().optional(),
  processorGeneration: z.string().optional(),
  ram: z.string().optional(),
  storage: z.string().optional(),
  graphics: z.string().optional(),
  wifi: z.string().optional(),
  bluetooth: z.string().optional(),
  ports: z.string().optional(),
  dimensions: z.string().optional(),
  weight: z.string().optional(),
  features: z.string().optional(),
  warrantySummary: z.string().optional(),
  salesPackage: z.string().optional(),
});

// Tablet Schema (updated to match fieldConfig fields where applicable)
export const tabletSchema = baseSchema.extend({
  brand: z.string().optional(),
  modelNumber: z.string().optional(),
  displaySize: z.string().optional(),
  screenResolution: z.string().optional(),
  screenType: z.string().optional(),
  processor: z.string().optional(),
  ram: z.string().optional(),
  storage: z.string().optional(),
  expandableStorage: z.string().optional(),
  networkType: z.string().optional(),
  wifi: z.string().optional(),
  bluetooth: z.string().optional(),
  gps: z.string().optional(),
  batteryCapacity: z.string().optional(),
  dimensions: z.string().optional(),
  weight: z.string().optional(),
  features: z.string().optional(),
  warrantySummary: z.string().optional(),
  salesPackage: z.string().optional(),
});

export const productSchemas = {
  "Home Appliances": homeApplianceSchema,
  "Sports & Fitness": sportsFitnessSchema,
  "Headphones": headphonesSchema,
  "Beauty & Skincare": beautySkincareSchema,
  "Men's Shoes": mensShoesSchema,
  "T-Shirts": tShirtsSchema,
  "Smartphones": smartphoneSchema,
  "Laptops": laptopSchema,
  "Watches": watchesSchema,
  "Women's Dresses": womensDressesSchema,
  "Electronics": electronicsSchema,
  "led-tv": ledTvSchema,
  "smart-tv": smartTvSchema,
  "desktop-pc": desktopPcSchema,
  "tablet": tabletSchema,
} as const;

export const fieldConfig: Record<any, { name: any; label: string; placeholder: string; type?: "input" | "textarea" }[]> = {
  "Home Appliances": [
    { name: "brand", label: "Brand", placeholder: "e.g. Samsung, LG, Whirlpool" },
    { name: "modelNumber", label: "Model Number", placeholder: "e.g. WF45K6200AW" },
    { name: "capacity", label: "Capacity", placeholder: "e.g. 7 kg, 250 L" },
    { name: "energyRating", label: "Energy Rating", placeholder: "e.g. 5 Star, BEE Rating" },
    { name: "features", label: "Key Features", placeholder: "e.g. Inverter Technology, Auto Clean, Smart Control" },
    { name: "dimensions", label: "Dimensions (W x H x D)", placeholder: "e.g. 60 x 85 x 60 cm" },
    { name: "weight", label: "Weight", placeholder: "e.g. 35 kg" },
    { name: "warrantySummary", label: "Warranty Summary", placeholder: "e.g. 1 Year Comprehensive Warranty" },
    { name: "salesPackage", label: "Sales Package", placeholder: "e.g. Main Unit, Power Cable, User Manual, Warranty Card" },
  ],
  "Sports & Fitness": [
    { name: "brand", label: "Brand", placeholder: "e.g. Nike, Adidas, Decathlon" },
    { name: "productType", label: "Product Type", placeholder: "e.g. Treadmill, Dumbbell Set, Yoga Mat" },
    { name: "material", label: "Material", placeholder: "e.g. Steel, Rubber, Neoprene" },
    { name: "weightCapacity", label: "Weight Capacity", placeholder: "e.g. 150 kg" },
    { name: "features", label: "Features", placeholder: "e.g. Adjustable Resistance, Foldable Design, Heart Rate Monitor" },
    { name: "dimensions", label: "Assembled Dimensions", placeholder: "e.g. 180 x 90 x 150 cm" },
    { name: "weight", label: "Weight", placeholder: "e.g. 25 kg" },
    { name: "warrantySummary", label: "Warranty Summary", placeholder: "e.g. 6 Months Manufacturer Warranty" },
    { name: "salesPackage", label: "Sales Package", placeholder: "e.g. Main Unit, Assembly Tools, Instruction Manual" },
  ],
  "Headphones": [
    { name: "brand", label: "Brand", placeholder: "e.g. Sony, JBL, Bose" },
    { name: "modelNumber", label: "Model Number", placeholder: "e.g. WH-1000XM5" },
    { name: "type", label: "Type", placeholder: "e.g. Over-Ear, In-Ear, On-Ear" },
    { name: "connectivity", label: "Connectivity", placeholder: "e.g. Bluetooth 5.2, Wired, USB-C" },
    { name: "batteryLife", label: "Battery Life", placeholder: "e.g. Up to 30 hours" },
    { name: "noiseCancellation", label: "Noise Cancellation", placeholder: "e.g. Active Noise Cancellation (ANC)" },
    { name: "waterResistance", label: "Water Resistance", placeholder: "e.g. IPX4" },
    { name: "features", label: "Features", placeholder: "e.g. Touch Controls, Voice Assistant, Multi-Point Pairing" },
    { name: "dimensions", label: "Dimensions", placeholder: "e.g. 18 x 16 x 8 cm" },
    { name: "weight", label: "Weight", placeholder: "e.g. 250 g" },
    { name: "warrantySummary", label: "Warranty Summary", placeholder: "e.g. 1 Year Limited Warranty" },
    { name: "salesPackage", label: "Sales Package", placeholder: "e.g. Headphones, Charging Cable, Carrying Case, User Manual" },
  ],
  "Beauty & Skincare": [
    { name: "brand", label: "Brand", placeholder: "e.g. L'Oreal, Olay, The Ordinary" },
    { name: "productType", label: "Product Type", placeholder: "e.g. Moisturizer, Serum, Cleanser" },
    { name: "skinType", label: "Suitable For Skin Type", placeholder: "e.g. All Skin Types, Oily, Dry, Sensitive" },
    { name: "keyIngredients", label: "Key Ingredients", placeholder: "e.g. Hyaluronic Acid, Niacinamide, Vitamin C" },
    { name: "volume", label: "Volume / Net Weight", placeholder: "e.g. 50 ml, 100 g" },
    { name: "usageInstructions", label: "Usage Instructions", placeholder: "e.g. Apply morning and night after cleansing" },
    { name: "features", label: "Features", placeholder: "e.g. Non-comedogenic, Paraben-Free, Dermatologically Tested" },
    { name: "shelfLife", label: "Shelf Life / Expiry", placeholder: "e.g. 12 months after opening" },
    { name: "warrantySummary", label: "Warranty / Return Policy", placeholder: "e.g. 30 Days Return Policy if Unopened" },
  ],
  "Men's Shoes": [
    { name: "brand", label: "Brand", placeholder: "e.g. Nike, Adidas, Puma" },
    { name: "modelNumber", label: "Model Number", placeholder: "e.g. Air Max 270" },
    { name: "shoeType", label: "Shoe Type", placeholder: "e.g. Sneakers, Formal, Casual, Running" },
    { name: "material", label: "Upper Material", placeholder: "e.g. Leather, Mesh, Synthetic" },
    { name: "soleMaterial", label: "Sole Material", placeholder: "e.g. Rubber, EVA, TPR" },
    { name: "color", label: "Color", placeholder: "e.g. Black, White, Blue" },
    { name: "size", label: "Available Sizes", placeholder: "e.g. UK 7, 8, 9, 10" },
    { name: "features", label: "Features", placeholder: "e.g. Breathable, Slip-Resistant, Cushioned Sole" },
    { name: "dimensions", label: "Approximate Dimensions", placeholder: "e.g. Length: 28 cm, Width: 10 cm" },
    { name: "weight", label: "Weight per Shoe", placeholder: "e.g. 350 g" },
    { name: "warrantySummary", label: "Warranty / Guarantee", placeholder: "e.g. 30 Days Quality Guarantee" },
    { name: "salesPackage", label: "Sales Package", placeholder: "e.g. 1 Pair of Shoes, Dust Bag, Box" },
  ],
  "T-Shirts": [
    { name: "brand", label: "Brand", placeholder: "e.g. Levi's, Zara, H&M" },
    { name: "modelNumber", label: "Model Number", placeholder: "e.g. TSH-2025" },
    { name: "fabric", label: "Fabric", placeholder: "e.g. Cotton, Polyester, Cotton Blend" },
    { name: "fit", label: "Fit", placeholder: "e.g. Slim Fit, Regular Fit, Oversized" },
    { name: "neckStyle", label: "Neck Style", placeholder: "e.g. Round Neck, V-Neck, Crew Neck" },
    { name: "sleeveLength", label: "Sleeve Length", placeholder: "e.g. Short Sleeve, Long Sleeve" },
    { name: "color", label: "Color", placeholder: "e.g. Red, Blue, Green, Black" },
    { name: "size", label: "Available Sizes", placeholder: "e.g. S, M, L, XL, XXL" },
    { name: "features", label: "Features", placeholder: "e.g. Anti-Odor, UV Protection, Moisture-Wicking" },
    { name: "careInstructions", label: "Care Instructions", placeholder: "e.g. Machine Wash Cold, Do Not Bleach" },
    { name: "warrantySummary", label: "Return Policy", placeholder: "e.g. 14 Days Easy Return" },
  ],
  "Smartphones": [
    { name: "brand", label: "Brand", placeholder: "e.g. Apple, Samsung, Xiaomi" },
    { name: "modelNumber", label: "Model Number", placeholder: "e.g. iPhone 15 Pro, Galaxy S24" },
    { name: "displaySize", label: "Display Size", placeholder: "e.g. 6.1 inches" },
    { name: "screenResolution", label: "Screen Resolution", placeholder: "e.g. 2532 x 1170 pixels" },
    { name: "screenType", label: "Screen Type", placeholder: "e.g. Super Retina XDR, AMOLED" },
    { name: "processor", label: "Processor", placeholder: "e.g. A17 Pro, Snapdragon 8 Gen 3" },
    { name: "ram", label: "RAM", placeholder: "e.g. 6 GB, 8 GB" },
    { name: "internalStorage", label: "Internal Storage", placeholder: "e.g. 128 GB, 256 GB" },
    { name: "expandableStorage", label: "Expandable Storage", placeholder: "e.g. Up to 1 TB (via microSD)" },
    { name: "primaryCamera", label: "Primary Camera", placeholder: "e.g. 48 MP + 12 MP + 12 MP" },
    { name: "secondaryCamera", label: "Secondary Camera", placeholder: "e.g. 12 MP" },
    { name: "networkType", label: "Network Type", placeholder: "e.g. 5G, 4G LTE" },
    { name: "wifi", label: "Wi-Fi", placeholder: "e.g. Wi-Fi 6E" },
    { name: "bluetooth", label: "Bluetooth", placeholder: "e.g. v5.3" },
    { name: "gps", label: "GPS", placeholder: "e.g. Yes, A-GPS, GLONASS" },
    { name: "batteryCapacity", label: "Battery Capacity", placeholder: "e.g. 3200 mAh" },
    { name: "charging", label: "Charging", placeholder: "e.g. 20W Fast Charging, Wireless Charging" },
    { name: "dimensions", label: "Dimensions", placeholder: "e.g. 146.7 x 71.5 x 7.8 mm" },
    { name: "weight", label: "Weight", placeholder: "e.g. 187 g" },
    { name: "warrantySummary", label: "Warranty Summary", placeholder: "e.g. 1 Year Manufacturer Warranty" },
  ],
  "Laptops": [
    { name: "brand", label: "Brand", placeholder: "e.g. Dell, HP, Lenovo" },
    { name: "modelNumber", label: "Model Number", placeholder: "e.g. Inspiron 15, MacBook Air M2" },
    { name: "displaySize", label: "Display Size", placeholder: "e.g. 15.6 inches" },
    { name: "screenResolution", label: "Screen Resolution", placeholder: "e.g. 1920 x 1080 pixels" },
    { name: "screenRefreshRate", label: "Screen Refresh Rate", placeholder: "e.g. 60 Hz, 120 Hz" },
    { name: "processor", label: "Processor", placeholder: "e.g. Intel Core i7-1360P, AMD Ryzen 7 7840U" },
    { name: "processorGeneration", label: "Processor Generation", placeholder: "e.g. 13th Gen, Ryzen 7000 Series" },
    { name: "ram", label: "RAM", placeholder: "e.g. 16 GB DDR5" },
    { name: "storage", label: "Storage", placeholder: "e.g. 512 GB SSD, 1 TB NVMe SSD" },
    { name: "graphics", label: "Graphics", placeholder: "e.g. Intel Iris Xe, NVIDIA GeForce RTX 4050" },
    { name: "wifi", label: "Wi-Fi", placeholder: "e.g. Wi-Fi 6E" },
    { name: "bluetooth", label: "Bluetooth", placeholder: "e.g. v5.2" },
    { name: "ports", label: "Ports", placeholder: "e.g. 2x USB-A, 2x USB-C, HDMI, SD Card Reader" },
    { name: "batteryBackup", label: "Battery Backup", placeholder: "e.g. Up to 10 hours" },
    { name: "dimensions", label: "Dimensions", placeholder: "e.g. 35.8 x 23.5 x 1.7 cm" },
    { name: "weight", label: "Weight", placeholder: "e.g. 1.6 kg" },
    { name: "warrantySummary", label: "Warranty Summary", placeholder: "e.g. 1 Year International Warranty" },
  ],
  "Watches": [
    { name: "brand", label: "Brand", placeholder: "e.g. Casio, Fossil, Apple" },
    { name: "modelNumber", label: "Model Number", placeholder: "e.g. G-Shock GA-2100, Apple Watch Series 9" },
    { name: "watchType", label: "Watch Type", placeholder: "e.g. Analog, Digital, Smartwatch" },
    { name: "caseMaterial", label: "Case Material", placeholder: "e.g. Stainless Steel, Plastic, Aluminum" },
    { name: "bandMaterial", label: "Band Material", placeholder: "e.g. Silicone, Leather, Metal" },
    { name: "dialColor", label: "Dial Color", placeholder: "e.g. Black, Silver, Blue" },
    { name: "waterResistance", label: "Water Resistance", placeholder: "e.g. 50m, 10 ATM, 5ATM" },
    { name: "features", label: "Features", placeholder: "e.g. Heart Rate Monitor, GPS, Sleep Tracking" },
    { name: "batteryLife", label: "Battery Life", placeholder: "e.g. Up to 18 months (Analog), 18 hours (Smart)" },
    { name: "dimensions", label: "Case Diameter", placeholder: "e.g. 44 mm" },
    { name: "weight", label: "Weight", placeholder: "e.g. 50 g" },
    { name: "warrantySummary", label: "Warranty Summary", placeholder: "e.g. 2 Years Manufacturer Warranty" },
    { name: "salesPackage", label: "Sales Package", placeholder: "e.g. Watch, Charger, User Manual, Warranty Card" },
  ],
  "Women's Dresses": [
    { name: "brand", label: "Brand", placeholder: "e.g. Zara, H&M, Myntra" },
    { name: "modelNumber", label: "Model Number", placeholder: "e.g. DR-2025" },
    { name: "dressType", label: "Dress Type", placeholder: "e.g. Maxi, Mini, Shift, Wrap" },
    { name: "fabric", label: "Fabric", placeholder: "e.g. Cotton, Chiffon, Satin" },
    { name: "sleeveLength", label: "Sleeve Length", placeholder: "e.g. Sleeveless, Short Sleeve, Long Sleeve" },
    { name: "neckline", label: "Neckline", placeholder: "e.g. V-Neck, Round Neck, Off-Shoulder" },
    { name: "color", label: "Color", placeholder: "e.g. Red, Navy, Floral Print" },
    { name: "size", label: "Available Sizes", placeholder: "e.g. S, M, L, XL, XXL" },
    { name: "features", label: "Features", placeholder: "e.g. Elastic Waist, Pleated, Lined" },
    { name: "careInstructions", label: "Care Instructions", placeholder: "e.g. Hand Wash Only, Do Not Iron" },
    { name: "warrantySummary", label: "Return Policy", placeholder: "e.g. 14 Days Easy Return" },
  ],
  "Electronics": [
    { name: "brand", label: "Brand", placeholder: "e.g. Sony, Philips, Logitech" },
    { name: "modelNumber", label: "Model Number", placeholder: "e.g. WH-CH520, HD200" },
    { name: "productType", label: "Product Type", placeholder: "e.g. Speaker, Router, Power Bank" },
    { name: "connectivity", label: "Connectivity", placeholder: "e.g. Bluetooth, Wi-Fi, USB" },
    { name: "powerSource", label: "Power Source", placeholder: "e.g. Battery, AC Adapter, USB" },
    { name: "batteryLife", label: "Battery Life", placeholder: "e.g. Up to 15 hours" },
    { name: "features", label: "Features", placeholder: "e.g. Waterproof, Voice Control, LED Display" },
    { name: "dimensions", label: "Dimensions", placeholder: "e.g. 15 x 10 x 5 cm" },
    { name: "weight", label: "Weight", placeholder: "e.g. 500 g" },
    { name: "warrantySummary", label: "Warranty Summary", placeholder: "e.g. 1 Year Limited Warranty" },
    { name: "salesPackage", label: "Sales Package", placeholder: "e.g. Main Unit, Charging Cable, User Manual" },
  ],
};

export type ProductFormValues = z.infer<
  | typeof homeApplianceSchema
  | typeof sportsFitnessSchema
  | typeof headphonesSchema
  | typeof beautySkincareSchema
  | typeof mensShoesSchema
  | typeof tShirtsSchema
  | typeof smartphoneSchema
  | typeof laptopSchema
  | typeof watchesSchema
  | typeof womensDressesSchema
  | typeof electronicsSchema
  | typeof ledTvSchema
  | typeof smartTvSchema
  | typeof desktopPcSchema
  | typeof tabletSchema
>;