/**
 * Currency validation utilities
 */

// ISO 4217 currency code validation
export function isValidISO4217Code(code: string): boolean {
  // Must be exactly 3 uppercase letters
  return /^[A-Z]{3}$/.test(code);
}

// Common currency symbols that should be flagged as potentially problematic
const PROBLEMATIC_SYMBOLS = ['<', '>', '"', "'", '&', '\\', '/', '|', ';'];

export function isValidCurrencySymbol(symbol: string): boolean {
  if (!symbol || symbol.trim().length === 0) return false;
  if (symbol.length > 10) return false; // Too long
  
  // Check for problematic characters
  return !PROBLEMATIC_SYMBOLS.some(char => symbol.includes(char));
}

export function isValidCurrencyName(name: string): boolean {
  if (!name || name.trim().length === 0) return false;
  if (name.length > 100) return false;
  
  // Basic validation - alphanumeric, spaces, and common punctuation
  return /^[a-zA-Z0-9\s\-\.\']+$/.test(name);
}

export function isValidDisplayName(displayName: string): boolean {
  if (!displayName || displayName.trim().length === 0) return false;
  if (displayName.length > 50) return false;
  
  // More permissive for display names
  return true;
}

export function isValidDecimalPlaces(decimalPlaces: number): boolean {
  return Number.isInteger(decimalPlaces) && decimalPlaces >= 0 && decimalPlaces <= 4;
}

export function isValidExchangeRate(rate: number): boolean {
  return Number.isFinite(rate) && rate > 0 && rate <= 1000000; // Reasonable bounds
}

export function isValidLocale(locale: string): boolean {
  if (!locale) return true; // Optional field
  
  try {
    // Test if the locale is valid by trying to create a NumberFormat
    new Intl.NumberFormat(locale);
    return true;
  } catch (error) {
    return false;
  }
}

// Comprehensive currency validation
export interface CurrencyValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateCurrencyData(data: {
  code: string;
  name: string;
  symbol: string;
  displayName: string;
  decimalPlaces: number;
  exchangeRate?: number;
  locale?: string;
}): CurrencyValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Code validation
  if (!isValidISO4217Code(data.code)) {
    errors.push("Currency code must be exactly 3 uppercase letters (ISO 4217 format)");
  }

  // Name validation
  if (!isValidCurrencyName(data.name)) {
    errors.push("Currency name is invalid or too long (max 100 characters)");
  }

  // Symbol validation
  if (!isValidCurrencySymbol(data.symbol)) {
    errors.push("Currency symbol is invalid or contains problematic characters");
  }

  // Display name validation
  if (!isValidDisplayName(data.displayName)) {
    errors.push("Display name is invalid or too long (max 50 characters)");
  }

  // Decimal places validation
  if (!isValidDecimalPlaces(data.decimalPlaces)) {
    errors.push("Decimal places must be between 0 and 4");
  }

  // Exchange rate validation
  if (data.exchangeRate !== undefined && !isValidExchangeRate(data.exchangeRate)) {
    errors.push("Exchange rate must be a positive number between 0 and 1,000,000");
  }

  // Locale validation
  if (data.locale && !isValidLocale(data.locale)) {
    errors.push("Locale format is invalid");
  }

  // Warnings for common issues
  if (data.symbol.length > 3) {
    warnings.push("Currency symbol is unusually long - consider using a shorter symbol");
  }

  if (data.code === data.symbol) {
    warnings.push("Currency code and symbol are identical - this may cause confusion");
  }

  if (data.exchangeRate && (data.exchangeRate < 0.000001 || data.exchangeRate > 100000)) {
    warnings.push("Exchange rate seems unusual - please verify it's correct");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Check for duplicate currency codes (for create operations)
export function validateNoDuplicateCode(code: string, existingCodes: string[]): boolean {
  return !existingCodes.map(c => c.toUpperCase()).includes(code.toUpperCase());
}

// Sanitize currency input data
export function sanitizeCurrencyData(data: {
  code: string;
  name: string;
  symbol: string;
  displayName: string;
  decimalPlaces: number;
  exchangeRate?: number | string;
  locale?: string;
}) {
  return {
    code: data.code.toUpperCase().trim(),
    name: data.name.trim(),
    symbol: data.symbol.trim(),
    displayName: data.displayName.trim(),
    decimalPlaces: Number(data.decimalPlaces),
    exchangeRate: data.exchangeRate ? Number(data.exchangeRate) : undefined,
    locale: data.locale?.trim() || undefined
  };
}

// Common currency codes that are well-known and should be handled carefully
export const WELL_KNOWN_CURRENCY_CODES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD',
  'CNY', 'HKD', 'SGD', 'KRW', 'INR', 'THB', 'MYR', 'IDR',
  'PHP', 'VND', 'NOK', 'SEK', 'DKK', 'PLN', 'CZK', 'HUF',
  'RON', 'AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'ILS',
  'EGP', 'ZAR', 'MXN', 'BRL', 'ARS', 'CLP', 'COP', 'PEN',
  'RUB', 'TRY', 'PKR', 'BDT', 'LKR'
];

export function isWellKnownCurrency(code: string): boolean {
  return WELL_KNOWN_CURRENCY_CODES.includes(code.toUpperCase());
}