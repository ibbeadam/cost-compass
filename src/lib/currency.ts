// Currency utility functions and definitions
import { prisma } from "@/lib/prisma";

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  displayName: string;
  decimalPlaces?: number;
  locale?: string;
}

// Database currency interface (extended)
export interface DatabaseCurrency extends Currency {
  id: number;
  decimalPlaces: number;
  isActive: boolean;
  isDefault: boolean;
  isSystemCurrency: boolean;
  exchangeRate?: number | null;
  locale?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Comprehensive list of commonly used currencies
export const CURRENCIES: Currency[] = [
  // Major currencies
  { code: "USD", name: "US Dollar", symbol: "$", displayName: "USD ($)" },
  { code: "EUR", name: "Euro", symbol: "€", displayName: "EUR (€)" },
  { code: "GBP", name: "British Pound", symbol: "£", displayName: "GBP (£)" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", displayName: "JPY (¥)" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", displayName: "CHF" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", displayName: "CAD (C$)" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", displayName: "AUD (A$)" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", displayName: "NZD (NZ$)" },
  
  // Asian currencies
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", displayName: "CNY (¥)" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", displayName: "HKD (HK$)" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", displayName: "SGD (S$)" },
  { code: "KRW", name: "South Korean Won", symbol: "₩", displayName: "KRW (₩)" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", displayName: "INR (₹)" },
  { code: "THB", name: "Thai Baht", symbol: "฿", displayName: "THB (฿)" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", displayName: "MYR (RM)" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", displayName: "IDR (Rp)" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱", displayName: "PHP (₱)" },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫", displayName: "VND (₫)" },
  
  // European currencies
  { code: "NOK", name: "Norwegian Krone", symbol: "kr", displayName: "NOK (kr)" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr", displayName: "SEK (kr)" },
  { code: "DKK", name: "Danish Krone", symbol: "kr", displayName: "DKK (kr)" },
  { code: "PLN", name: "Polish Zloty", symbol: "zł", displayName: "PLN (zł)" },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč", displayName: "CZK (Kč)" },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft", displayName: "HUF (Ft)" },
  { code: "RON", name: "Romanian Leu", symbol: "lei", displayName: "RON (lei)" },
  
  // Middle East & Africa
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", displayName: "AED (د.إ)" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼", displayName: "SAR (﷼)" },
  { code: "QAR", name: "Qatari Riyal", symbol: "﷼", displayName: "QAR (﷼)" },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "د.ك", displayName: "KWD (د.ك)" },
  { code: "BHD", name: "Bahraini Dinar", symbol: ".د.ب", displayName: "BHD (.د.ب)" },
  { code: "OMR", name: "Omani Rial", symbol: "﷼", displayName: "OMR (﷼)" },
  { code: "ILS", name: "Israeli Shekel", symbol: "₪", displayName: "ILS (₪)" },
  { code: "EGP", name: "Egyptian Pound", symbol: "£", displayName: "EGP (£)" },
  { code: "ZAR", name: "South African Rand", symbol: "R", displayName: "ZAR (R)" },
  
  // Latin America
  { code: "MXN", name: "Mexican Peso", symbol: "$", displayName: "MXN ($)" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", displayName: "BRL (R$)" },
  { code: "ARS", name: "Argentine Peso", symbol: "$", displayName: "ARS ($)" },
  { code: "CLP", name: "Chilean Peso", symbol: "$", displayName: "CLP ($)" },
  { code: "COP", name: "Colombian Peso", symbol: "$", displayName: "COP ($)" },
  { code: "PEN", name: "Peruvian Sol", symbol: "S/", displayName: "PEN (S/)" },
  
  // Other currencies
  { code: "RUB", name: "Russian Ruble", symbol: "₽", displayName: "RUB (₽)" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", displayName: "TRY (₺)" },
  { code: "PKR", name: "Pakistani Rupee", symbol: "₨", displayName: "PKR (₨)" },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳", displayName: "BDT (৳)" },
  { code: "LKR", name: "Sri Lankan Rupee", symbol: "₨", displayName: "LKR (₨)" },
];

// Default currency
export const DEFAULT_CURRENCY = "USD";

// Get currency by code
export function getCurrency(code: string): Currency | undefined {
  return CURRENCIES.find(currency => currency.code === code);
}

// Get currency symbol by code
export function getCurrencySymbol(code: string): string {
  const currency = getCurrency(code);
  return currency?.symbol || "$";
}

// Get currency display name by code
export function getCurrencyDisplayName(code: string): string {
  const currency = getCurrency(code);
  return currency?.displayName || `${code}`;
}

// Format currency amount
export function formatCurrency(
  amount: number, 
  currencyCode: string = DEFAULT_CURRENCY,
  options: Intl.NumberFormatOptions = {}
): string {
  const currency = getCurrency(currencyCode);
  
  if (!currency) {
    // Fallback to basic formatting if currency not found
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: DEFAULT_CURRENCY,
      ...options,
    }).format(amount);
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      ...options,
    }).format(amount);
  } catch (error) {
    // Fallback if currency code is not supported by Intl.NumberFormat
    console.warn(`Currency ${currencyCode} not supported by Intl.NumberFormat, using symbol fallback`);
    const formattedNumber = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options,
    }).format(amount);
    return `${currency.symbol}${formattedNumber}`;
  }
}

// Format currency for different contexts
export function formatCurrencyCompact(amount: number, currencyCode: string = DEFAULT_CURRENCY): string {
  return formatCurrency(amount, currencyCode, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    notation: "compact",
  });
}

export function formatCurrencyPrecise(amount: number, currencyCode: string = DEFAULT_CURRENCY): string {
  return formatCurrency(amount, currencyCode, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

// Group currencies by region for better UX
export const CURRENCY_GROUPS = {
  "Major Currencies": CURRENCIES.filter(c => 
    ["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD"].includes(c.code)
  ),
  "Asian Currencies": CURRENCIES.filter(c => 
    ["CNY", "HKD", "SGD", "KRW", "INR", "THB", "MYR", "IDR", "PHP", "VND"].includes(c.code)
  ),
  "European Currencies": CURRENCIES.filter(c => 
    ["NOK", "SEK", "DKK", "PLN", "CZK", "HUF", "RON"].includes(c.code)
  ),
  "Middle East & Africa": CURRENCIES.filter(c => 
    ["AED", "SAR", "QAR", "KWD", "BHD", "OMR", "ILS", "EGP", "ZAR"].includes(c.code)
  ),
  "Americas": CURRENCIES.filter(c => 
    ["MXN", "BRL", "ARS", "CLP", "COP", "PEN"].includes(c.code)
  ),
  "Other": CURRENCIES.filter(c => 
    ["RUB", "TRY", "PKR", "BDT", "LKR", "NZD"].includes(c.code)
  ),
};

// Validate currency code
export function isValidCurrencyCode(code: string): boolean {
  return CURRENCIES.some(currency => currency.code === code);
}

// Get popular currencies (most commonly used)
export function getPopularCurrencies(): Currency[] {
  return CURRENCIES.filter(c => 
    ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "INR", "SGD"].includes(c.code)
  );
}

// Property-aware currency formatting
export function formatPropertyCurrency(
  amount: number,
  property?: { currency?: string } | null,
  options: Intl.NumberFormatOptions = {}
): string {
  const currencyCode = property?.currency || DEFAULT_CURRENCY;
  return formatCurrency(amount, currencyCode, options);
}

// Property-aware compact currency formatting
export function formatPropertyCurrencyCompact(
  amount: number,
  property?: { currency?: string } | null
): string {
  const currencyCode = property?.currency || DEFAULT_CURRENCY;
  return formatCurrencyCompact(amount, currencyCode);
}

// =============================================================================
// DATABASE-DRIVEN CURRENCY FUNCTIONS
// =============================================================================

/**
 * Get all active currencies from database
 */
export async function getActiveCurrenciesFromDB(): Promise<DatabaseCurrency[]> {
  try {
    const currencies = await prisma.currency.findMany({
      where: { isActive: true },
      orderBy: [
        { isDefault: 'desc' },
        { isSystemCurrency: 'desc' },
        { name: 'asc' }
      ]
    });

    return currencies.map(currency => ({
      ...currency,
      exchangeRate: currency.exchangeRate ? Number(currency.exchangeRate) : undefined
    }));
  } catch (error) {
    console.error("Error fetching active currencies from database:", error);
    // Fallback to hardcoded currencies
    return CURRENCIES.map(c => ({
      ...c,
      id: 0,
      decimalPlaces: 2,
      isActive: true,
      isDefault: c.code === DEFAULT_CURRENCY,
      isSystemCurrency: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
  }
}

/**
 * Get currency by code from database
 */
export async function getCurrencyFromDB(code: string): Promise<DatabaseCurrency | null> {
  try {
    const currency = await prisma.currency.findUnique({
      where: { 
        code: code.toUpperCase(),
        isActive: true 
      }
    });

    if (!currency) return null;

    return {
      ...currency,
      exchangeRate: currency.exchangeRate ? Number(currency.exchangeRate) : undefined
    };
  } catch (error) {
    console.error("Error fetching currency from database:", error);
    // Fallback to hardcoded currency
    const fallback = CURRENCIES.find(c => c.code === code.toUpperCase());
    if (fallback) {
      return {
        ...fallback,
        id: 0,
        decimalPlaces: 2,
        isActive: true,
        isDefault: fallback.code === DEFAULT_CURRENCY,
        isSystemCurrency: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    return null;
  }
}

/**
 * Get default currency from database
 */
export async function getDefaultCurrencyFromDB(): Promise<DatabaseCurrency | null> {
  try {
    const currency = await prisma.currency.findFirst({
      where: { 
        isDefault: true,
        isActive: true 
      }
    });

    if (!currency) {
      // Fallback: try to find USD
      const usdCurrency = await prisma.currency.findUnique({
        where: { 
          code: DEFAULT_CURRENCY,
          isActive: true 
        }
      });
      
      if (usdCurrency) {
        return {
          ...usdCurrency,
          exchangeRate: usdCurrency.exchangeRate ? Number(usdCurrency.exchangeRate) : undefined
        };
      }
      return null;
    }

    return {
      ...currency,
      exchangeRate: currency.exchangeRate ? Number(currency.exchangeRate) : undefined
    };
  } catch (error) {
    console.error("Error fetching default currency from database:", error);
    // Fallback to hardcoded USD
    const usd = CURRENCIES.find(c => c.code === DEFAULT_CURRENCY);
    if (usd) {
      return {
        ...usd,
        id: 0,
        decimalPlaces: 2,
        isActive: true,
        isDefault: true,
        isSystemCurrency: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    return null;
  }
}

/**
 * Format currency using database currency settings
 */
export async function formatCurrencyFromDB(
  amount: number,
  currencyCode: string = DEFAULT_CURRENCY,
  options: Intl.NumberFormatOptions = {}
): Promise<string> {
  try {
    const currency = await getCurrencyFromDB(currencyCode);
    
    if (!currency) {
      // Fallback to standard formatting
      return formatCurrency(amount, currencyCode, options);
    }

    const formatOptions: Intl.NumberFormatOptions = {
      style: "currency",
      currency: currency.code,
      minimumFractionDigits: currency.decimalPlaces,
      maximumFractionDigits: currency.decimalPlaces,
      ...options,
    };

    try {
      const locale = currency.locale || "en-US";
      return new Intl.NumberFormat(locale, formatOptions).format(amount);
    } catch (error) {
      // Fallback if currency code is not supported by Intl.NumberFormat
      console.warn(`Currency ${currency.code} not supported by Intl.NumberFormat, using symbol fallback`);
      const formattedNumber = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: currency.decimalPlaces,
        maximumFractionDigits: currency.decimalPlaces,
        ...options,
      }).format(amount);
      return `${currency.symbol}${formattedNumber}`;
    }
  } catch (error) {
    console.error("Error formatting currency from database:", error);
    // Fallback to standard formatting
    return formatCurrency(amount, currencyCode, options);
  }
}

/**
 * Enhanced property-aware currency formatting using database
 */
export async function formatPropertyCurrencyFromDB(
  amount: number,
  property?: { currency?: string; currencyId?: number } | null,
  options: Intl.NumberFormatOptions = {}
): Promise<string> {
  try {
    let currency: DatabaseCurrency | null = null;

    // Try to get currency by ID first (more efficient)
    if (property?.currencyId) {
      currency = await prisma.currency.findUnique({
        where: { 
          id: property.currencyId,
          isActive: true 
        }
      });
      
      if (currency) {
        currency.exchangeRate = currency.exchangeRate ? Number(currency.exchangeRate) : undefined;
      }
    }

    // Fallback to currency code
    if (!currency && property?.currency) {
      currency = await getCurrencyFromDB(property.currency);
    }

    // Final fallback to default currency
    if (!currency) {
      currency = await getDefaultCurrencyFromDB();
    }

    if (!currency) {
      // Ultimate fallback to standard formatting
      return formatCurrency(amount, DEFAULT_CURRENCY, options);
    }

    return await formatCurrencyFromDB(amount, currency.code, options);
  } catch (error) {
    console.error("Error formatting property currency from database:", error);
    // Fallback to standard formatting
    const currencyCode = property?.currency || DEFAULT_CURRENCY;
    return formatCurrency(amount, currencyCode, options);
  }
}

/**
 * Validate currency code against database
 */
export async function isValidCurrencyCodeInDB(code: string): Promise<boolean> {
  try {
    const currency = await prisma.currency.findUnique({
      where: { 
        code: code.toUpperCase(),
        isActive: true 
      }
    });
    return !!currency;
  } catch (error) {
    console.error("Error validating currency code:", error);
    // Fallback to hardcoded validation
    return isValidCurrencyCode(code);
  }
}

/**
 * Get currencies for dropdown/selection (backward compatible)
 * Returns database currencies with fallback to hardcoded
 */
export async function getCurrenciesForDropdown(): Promise<Currency[]> {
  try {
    const dbCurrencies = await getActiveCurrenciesFromDB();
    return dbCurrencies.map(c => ({
      code: c.code,
      name: c.name,
      symbol: c.symbol,
      displayName: c.displayName,
      decimalPlaces: c.decimalPlaces,
      locale: c.locale
    }));
  } catch (error) {
    console.error("Error getting currencies for dropdown:", error);
    // Fallback to hardcoded currencies
    return CURRENCIES;
  }
}