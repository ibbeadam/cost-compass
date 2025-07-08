// Currency seed data for populating the database with predefined currencies
// This should be run after the Currency table is created

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const predefinedCurrencies = [
  // Major currencies
  { code: "USD", name: "US Dollar", symbol: "$", displayName: "USD ($)", locale: "en-US", isDefault: true },
  { code: "EUR", name: "Euro", symbol: "€", displayName: "EUR (€)", locale: "en-US" },
  { code: "GBP", name: "British Pound", symbol: "£", displayName: "GBP (£)", locale: "en-GB" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", displayName: "JPY (¥)", locale: "ja-JP", decimalPlaces: 0 },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", displayName: "CHF", locale: "de-CH" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", displayName: "CAD (C$)", locale: "en-CA" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", displayName: "AUD (A$)", locale: "en-AU" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", displayName: "NZD (NZ$)", locale: "en-NZ" },
  
  // Asian currencies
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", displayName: "CNY (¥)", locale: "zh-CN" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", displayName: "HKD (HK$)", locale: "en-HK" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", displayName: "SGD (S$)", locale: "en-SG" },
  { code: "KRW", name: "South Korean Won", symbol: "₩", displayName: "KRW (₩)", locale: "ko-KR", decimalPlaces: 0 },
  { code: "INR", name: "Indian Rupee", symbol: "₹", displayName: "INR (₹)", locale: "en-IN" },
  { code: "THB", name: "Thai Baht", symbol: "฿", displayName: "THB (฿)", locale: "th-TH" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", displayName: "MYR (RM)", locale: "ms-MY" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", displayName: "IDR (Rp)", locale: "id-ID", decimalPlaces: 0 },
  { code: "PHP", name: "Philippine Peso", symbol: "₱", displayName: "PHP (₱)", locale: "en-PH" },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫", displayName: "VND (₫)", locale: "vi-VN", decimalPlaces: 0 },
  
  // European currencies
  { code: "NOK", name: "Norwegian Krone", symbol: "kr", displayName: "NOK (kr)", locale: "nb-NO" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr", displayName: "SEK (kr)", locale: "sv-SE" },
  { code: "DKK", name: "Danish Krone", symbol: "kr", displayName: "DKK (kr)", locale: "da-DK" },
  { code: "PLN", name: "Polish Zloty", symbol: "zł", displayName: "PLN (zł)", locale: "pl-PL" },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč", displayName: "CZK (Kč)", locale: "cs-CZ" },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft", displayName: "HUF (Ft)", locale: "hu-HU", decimalPlaces: 0 },
  { code: "RON", name: "Romanian Leu", symbol: "lei", displayName: "RON (lei)", locale: "ro-RO" },
  
  // Middle East & Africa
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", displayName: "AED (د.إ)", locale: "ar-AE" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼", displayName: "SAR (﷼)", locale: "ar-SA" },
  { code: "QAR", name: "Qatari Riyal", symbol: "﷼", displayName: "QAR (﷼)", locale: "ar-QA" },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "د.ك", displayName: "KWD (د.ك)", locale: "ar-KW", decimalPlaces: 3 },
  { code: "BHD", name: "Bahraini Dinar", symbol: ".د.ب", displayName: "BHD (.د.ب)", locale: "ar-BH", decimalPlaces: 3 },
  { code: "OMR", name: "Omani Rial", symbol: "﷼", displayName: "OMR (﷼)", locale: "ar-OM", decimalPlaces: 3 },
  { code: "ILS", name: "Israeli Shekel", symbol: "₪", displayName: "ILS (₪)", locale: "he-IL" },
  { code: "EGP", name: "Egyptian Pound", symbol: "£", displayName: "EGP (£)", locale: "ar-EG" },
  { code: "ZAR", name: "South African Rand", symbol: "R", displayName: "ZAR (R)", locale: "en-ZA" },
  
  // Latin America
  { code: "MXN", name: "Mexican Peso", symbol: "$", displayName: "MXN ($)", locale: "es-MX" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", displayName: "BRL (R$)", locale: "pt-BR" },
  { code: "ARS", name: "Argentine Peso", symbol: "$", displayName: "ARS ($)", locale: "es-AR" },
  { code: "CLP", name: "Chilean Peso", symbol: "$", displayName: "CLP ($)", locale: "es-CL", decimalPlaces: 0 },
  { code: "COP", name: "Colombian Peso", symbol: "$", displayName: "COP ($)", locale: "es-CO", decimalPlaces: 0 },
  { code: "PEN", name: "Peruvian Sol", symbol: "S/", displayName: "PEN (S/)", locale: "es-PE" },
  
  // Other currencies
  { code: "RUB", name: "Russian Ruble", symbol: "₽", displayName: "RUB (₽)", locale: "ru-RU" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", displayName: "TRY (₺)", locale: "tr-TR" },
  { code: "PKR", name: "Pakistani Rupee", symbol: "₨", displayName: "PKR (₨)", locale: "en-PK" },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳", displayName: "BDT (৳)", locale: "bn-BD" },
  { code: "LKR", name: "Sri Lankan Rupee", symbol: "₨", displayName: "LKR (₨)", locale: "en-LK" },
];

export async function seedCurrencies() {
  try {
    console.log('Starting currency seeding...');

    // Check if currencies already exist
    const existingCount = await prisma.currency.count();
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing currencies. Skipping seed.`);
      return;
    }

    // Insert all predefined currencies
    for (const currencyData of predefinedCurrencies) {
      await prisma.currency.create({
        data: {
          code: currencyData.code,
          name: currencyData.name,
          symbol: currencyData.symbol,
          displayName: currencyData.displayName,
          locale: currencyData.locale || "en-US",
          decimalPlaces: currencyData.decimalPlaces || 2,
          isActive: true,
          isDefault: currencyData.isDefault || false,
          isSystemCurrency: true, // All predefined currencies are system currencies
          createdBy: null // System-created
        }
      });
    }

    console.log(`Successfully seeded ${predefinedCurrencies.length} currencies`);
    
    // Verify default currency
    const defaultCurrency = await prisma.currency.findFirst({
      where: { isDefault: true }
    });
    
    if (defaultCurrency) {
      console.log(`Default currency set to: ${defaultCurrency.code}`);
    } else {
      console.log('Warning: No default currency found');
    }

  } catch (error) {
    console.error('Error seeding currencies:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedCurrencies()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}