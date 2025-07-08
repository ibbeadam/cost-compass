"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { revalidatePath } from "next/cache";
import { auditDataChange } from "@/lib/audit-middleware";
import { validateCurrencyData, sanitizeCurrencyData, validateNoDuplicateCode } from "@/lib/currency-validation";

export interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  displayName: string;
  decimalPlaces: number;
  isActive: boolean;
  isDefault: boolean;
  isSystemCurrency: boolean;
  exchangeRate?: number;
  locale?: string;
  createdBy?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCurrencyData {
  code: string;
  name: string;
  symbol: string;
  displayName: string;
  decimalPlaces?: number;
  exchangeRate?: number;
  locale?: string;
  isActive?: boolean;
}

export interface UpdateCurrencyData {
  name?: string;
  symbol?: string;
  displayName?: string;
  decimalPlaces?: number;
  exchangeRate?: number;
  locale?: string;
  isActive?: boolean;
  isDefault?: boolean;
}

/**
 * Get all currencies with optional filtering
 */
export async function getCurrenciesAction(filters?: {
  isActive?: boolean;
  isSystemCurrency?: boolean;
  searchTerm?: string;
}): Promise<Currency[]> {
  try {
    const whereClause: any = {};
    
    if (filters?.isActive !== undefined) {
      whereClause.isActive = filters.isActive;
    }
    
    if (filters?.isSystemCurrency !== undefined) {
      whereClause.isSystemCurrency = filters.isSystemCurrency;
    }
    
    if (filters?.searchTerm) {
      whereClause.OR = [
        { code: { contains: filters.searchTerm, mode: 'insensitive' } },
        { name: { contains: filters.searchTerm, mode: 'insensitive' } },
        { displayName: { contains: filters.searchTerm, mode: 'insensitive' } }
      ];
    }

    const currencies = await prisma.currency.findMany({
      where: whereClause,
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
    console.error("Error fetching currencies:", error);
    throw new Error("Failed to fetch currencies");
  }
}

/**
 * Get a single currency by ID
 */
export async function getCurrencyByIdAction(id: number): Promise<Currency | null> {
  try {
    const currency = await prisma.currency.findUnique({
      where: { id }
    });

    if (!currency) return null;

    return {
      ...currency,
      exchangeRate: currency.exchangeRate ? Number(currency.exchangeRate) : undefined
    };
  } catch (error) {
    console.error("Error fetching currency:", error);
    throw new Error("Failed to fetch currency");
  }
}

/**
 * Get currency by code
 */
export async function getCurrencyByCodeAction(code: string): Promise<Currency | null> {
  try {
    const currency = await prisma.currency.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (!currency) return null;

    return {
      ...currency,
      exchangeRate: currency.exchangeRate ? Number(currency.exchangeRate) : undefined
    };
  } catch (error) {
    console.error("Error fetching currency by code:", error);
    throw new Error("Failed to fetch currency");
  }
}

/**
 * Create a new currency
 */
export async function createCurrencyAction(data: CreateCurrencyData): Promise<Currency> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    if (user.role !== "super_admin") {
      throw new Error("Only super administrators can manage currencies");
    }

    // Sanitize input data
    const sanitizedData = sanitizeCurrencyData({
      code: data.code,
      name: data.name,
      symbol: data.symbol,
      displayName: data.displayName,
      decimalPlaces: data.decimalPlaces || 2,
      exchangeRate: data.exchangeRate,
      locale: data.locale
    });

    // Validate currency data
    const validation = validateCurrencyData(sanitizedData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Check for duplicate currency code
    const existingCodes = await prisma.currency.findMany({
      select: { code: true }
    });
    
    if (!validateNoDuplicateCode(sanitizedData.code, existingCodes.map(c => c.code))) {
      throw new Error("Currency code already exists");
    }

    const currency = await prisma.currency.create({
      data: {
        code: sanitizedData.code,
        name: sanitizedData.name,
        symbol: sanitizedData.symbol,
        displayName: sanitizedData.displayName,
        decimalPlaces: sanitizedData.decimalPlaces,
        exchangeRate: sanitizedData.exchangeRate,
        locale: sanitizedData.locale,
        isActive: data.isActive !== false,
        isSystemCurrency: false, // User-created currencies are never system currencies
        createdBy: user.id
      }
    });

    // Create audit log
    await auditDataChange(
      user.id,
      "CREATE",
      "currency",
      currency.id,
      undefined,
      {
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol,
        displayName: currency.displayName
      }
    );

    revalidatePath('/dashboard/settings/currencies');
    
    return {
      ...currency,
      exchangeRate: currency.exchangeRate ? Number(currency.exchangeRate) : undefined
    };
  } catch (error) {
    console.error("Error creating currency:", error);
    if ((error as Error).message.includes("Currency code already exists")) {
      throw new Error("Currency code already exists. Please use a different code.");
    }
    if ((error as Error).message.includes("3 uppercase letters")) {
      throw new Error("Currency code must be exactly 3 uppercase letters (e.g., USD, EUR).");
    }
    throw new Error("Failed to create currency: " + (error as Error).message);
  }
}

/**
 * Update an existing currency
 */
export async function updateCurrencyAction(id: number, data: UpdateCurrencyData): Promise<Currency> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    if (user.role !== "super_admin") {
      throw new Error("Only super administrators can manage currencies");
    }

    // Get existing currency data for audit logging
    const existingCurrency = await prisma.currency.findUnique({
      where: { id }
    });

    if (!existingCurrency) {
      throw new Error("Currency not found");
    }

    // System currencies have restricted updates
    if (existingCurrency.isSystemCurrency) {
      // Only allow updating isActive, exchangeRate, and locale for system currencies
      const allowedFields = ['isActive', 'exchangeRate', 'locale'];
      const hasDisallowedFields = Object.keys(data).some(key => !allowedFields.includes(key));
      
      if (hasDisallowedFields) {
        throw new Error("System currencies can only have their status, exchange rate, and locale updated");
      }
    }

    // Handle default currency logic
    if (data.isDefault === true) {
      // First, remove default status from all other currencies
      await prisma.currency.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });
    }

    const currency = await prisma.currency.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });

    // Create audit log
    await auditDataChange(
      user.id,
      "UPDATE",
      "currency",
      currency.id,
      {
        name: existingCurrency.name,
        symbol: existingCurrency.symbol,
        displayName: existingCurrency.displayName,
        isActive: existingCurrency.isActive,
        isDefault: existingCurrency.isDefault
      },
      {
        name: currency.name,
        symbol: currency.symbol,
        displayName: currency.displayName,
        isActive: currency.isActive,
        isDefault: currency.isDefault
      }
    );

    revalidatePath('/dashboard/settings/currencies');
    
    return {
      ...currency,
      exchangeRate: currency.exchangeRate ? Number(currency.exchangeRate) : undefined
    };
  } catch (error) {
    console.error("Error updating currency:", error);
    if ((error as Error).message === "Currency not found") {
      throw new Error("Currency not found. It may have been deleted.");
    }
    throw new Error("Failed to update currency: " + (error as Error).message);
  }
}

/**
 * Delete a currency (only non-system currencies)
 */
export async function deleteCurrencyAction(id: number): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    if (user.role !== "super_admin") {
      throw new Error("Only super administrators can manage currencies");
    }

    // Check if currency exists and is not a system currency
    const currency = await prisma.currency.findUnique({
      where: { id },
      include: {
        properties: true
      }
    });

    if (!currency) {
      throw new Error("Currency not found");
    }

    if (currency.isSystemCurrency) {
      throw new Error("System currencies cannot be deleted");
    }

    if (currency.isDefault) {
      throw new Error("The default currency cannot be deleted. Please set another currency as default first.");
    }

    // Check if currency is in use by any properties
    if (currency.properties.length > 0) {
      throw new Error(`Currency is in use by ${currency.properties.length} properties. Please change their currency first.`);
    }

    // Create audit log before deletion
    await auditDataChange(
      user.id,
      "DELETE",
      "currency",
      id,
      {
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol,
        displayName: currency.displayName
      },
      undefined
    );

    // Delete the currency
    await prisma.currency.delete({
      where: { id }
    });

    revalidatePath('/dashboard/settings/currencies');
  } catch (error) {
    console.error("Error deleting currency:", error);
    if ((error as Error).message === "Currency not found") {
      throw new Error("Currency not found. It may have already been deleted.");
    }
    throw new Error("Failed to delete currency: " + (error as Error).message);
  }
}

/**
 * Set a currency as the default
 */
export async function setDefaultCurrencyAction(id: number): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    if (user.role !== "super_admin") {
      throw new Error("Only super administrators can manage currencies");
    }

    const currency = await prisma.currency.findUnique({
      where: { id }
    });

    if (!currency) {
      throw new Error("Currency not found");
    }

    if (!currency.isActive) {
      throw new Error("Cannot set an inactive currency as default");
    }

    // Use a transaction to ensure consistency
    await prisma.$transaction([
      // Remove default status from all currencies
      prisma.currency.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      }),
      // Set the new default
      prisma.currency.update({
        where: { id },
        data: { isDefault: true }
      })
    ]);

    // Create audit log
    await auditDataChange(
      user.id,
      "UPDATE",
      "currency",
      id,
      { isDefault: false },
      { isDefault: true }
    );

    revalidatePath('/dashboard/settings/currencies');
  } catch (error) {
    console.error("Error setting default currency:", error);
    throw new Error("Failed to set default currency: " + (error as Error).message);
  }
}

/**
 * Get the default currency
 */
export async function getDefaultCurrencyAction(): Promise<Currency | null> {
  try {
    const currency = await prisma.currency.findFirst({
      where: { 
        isDefault: true,
        isActive: true 
      }
    });

    if (!currency) return null;

    return {
      ...currency,
      exchangeRate: currency.exchangeRate ? Number(currency.exchangeRate) : undefined
    };
  } catch (error) {
    console.error("Error fetching default currency:", error);
    throw new Error("Failed to fetch default currency");
  }
}

/**
 * Get active currencies for dropdowns
 */
export async function getActiveCurrenciesAction(): Promise<Currency[]> {
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
    console.error("Error fetching active currencies:", error);
    throw new Error("Failed to fetch active currencies");
  }
}