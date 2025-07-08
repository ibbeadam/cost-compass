import { format } from "date-fns";

/**
 * Utility functions for formatting audit log data in a human-readable way
 */

export interface FormattedChange {
  field: string;
  displayName: string;
  type: 'simple' | 'array' | 'object';
  from: any;
  to: any;
  summary?: string;
  details?: string;
}

/**
 * Format field names to be human-readable
 */
export function formatFieldName(fieldName: string): string {
  const fieldMappings: Record<string, string> = {
    'isActive': 'Status',
    'propertyId': 'Property',
    'outletId': 'Outlet',
    'categoryId': 'Category',
    'userId': 'User',
    'createdBy': 'Created By',
    'updatedBy': 'Updated By',
    'createdAt': 'Created Date',
    'updatedAt': 'Updated Date',
    'totalFoodCost': 'Total Food Cost',
    'totalBeverageCost': 'Total Beverage Cost',
    'outletCode': 'Outlet Code',
    'propertyCode': 'Property Code',
    'categoryName': 'Category Name',
    'accessLevel': 'Access Level',
    'grantedAt': 'Granted Date',
    'grantedBy': 'Granted By',
    'phoneNumber': 'Phone Number',
    'lastLoginAt': 'Last Login',
    'passwordChangedAt': 'Password Changed',
    'twoFactorEnabled': 'Two Factor Auth',
    'actualFoodRevenue': 'Actual Food Revenue',
    'budgetFoodRevenue': 'Budget Food Revenue',
    'actualBeverageRevenue': 'Actual Beverage Revenue',
    'budgetBeverageRevenue': 'Budget Beverage Revenue',
  };

  if (fieldMappings[fieldName]) {
    return fieldMappings[fieldName];
  }

  // Convert camelCase/snake_case to readable format
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Format a single value for display
 */
export function formatValue(value: any, context?: string): string {
  if (value === null || value === undefined) return "None";
  if (typeof value === "boolean") {
    if (context === 'isActive') {
      return value ? "Active" : "Inactive";
    }
    return value ? "Yes" : "No";
  }
  if (typeof value === "string") {
    // Format dates if they look like ISO strings
    if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      try {
        return format(new Date(value), "MMM d, yyyy h:mm a");
      } catch {
        return value;
      }
    }
    return value;
  }
  if (typeof value === "number") {
    // Format money values
    if (context?.toLowerCase().includes('cost') || 
        context?.toLowerCase().includes('revenue') || 
        context?.toLowerCase().includes('price')) {
      // For audit logs, we use USD as standard for historical consistency
      // This ensures all historical audit data maintains consistent currency formatting
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD'
      }).format(value);
    }
    return value.toString();
  }
  if (value instanceof Date) {
    return format(value, "MMM d, yyyy h:mm a");
  }
  
  // For objects, try to extract meaningful display value
  if (typeof value === "object" && value !== null) {
    // Handle common object patterns
    if (value.name) return value.name;
    if (value.email) return value.email;
    if (value.title) return value.title;
    if (value.id && value.description) return `${value.description} (ID: ${value.id})`;
    if (value.id) return `ID: ${value.id}`;
  }
  
  return String(value);
}

/**
 * Get a human-readable summary for array changes
 */
export function getArrayChangeSummary(from: any[], to: any[]): string {
  const fromCount = from?.length || 0;
  const toCount = to?.length || 0;
  const diff = toCount - fromCount;
  
  if (diff > 0) {
    return `Added ${diff} item${diff > 1 ? 's' : ''} (${fromCount} → ${toCount})`;
  } else if (diff < 0) {
    return `Removed ${Math.abs(diff)} item${Math.abs(diff) > 1 ? 's' : ''} (${fromCount} → ${toCount})`;
  } else {
    return `Modified items (${toCount} total)`;
  }
}

/**
 * Format array changes for display
 */
export function formatArrayChange(from: any[], to: any[], fieldName: string): {
  summary: string;
  fromDisplay: string;
  toDisplay: string;
  details: Array<{ action: 'added' | 'removed' | 'modified'; item: string; id?: any }>;
} {
  const fromArray = from || [];
  const toArray = to || [];
  
  const summary = getArrayChangeSummary(fromArray, toArray);
  
  // For simple display
  const fromDisplay = fromArray.length === 0 
    ? "None" 
    : `${fromArray.length} item${fromArray.length > 1 ? 's' : ''}`;
  const toDisplay = toArray.length === 0 
    ? "None" 
    : `${toArray.length} item${toArray.length > 1 ? 's' : ''}`;
  
  // Try to detect specific changes
  const details: Array<{ action: 'added' | 'removed' | 'modified'; item: string; id?: any }> = [];
  
  // Simple approach: find items by ID if available
  const fromIds = new Set(fromArray.map(item => item?.id).filter(Boolean));
  const toIds = new Set(toArray.map(item => item?.id).filter(Boolean));
  
  // Added items
  toArray.forEach(item => {
    if (item?.id && !fromIds.has(item.id)) {
      details.push({
        action: 'added',
        item: getItemDisplayName(item, fieldName),
        id: item.id
      });
    }
  });
  
  // Removed items
  fromArray.forEach(item => {
    if (item?.id && !toIds.has(item.id)) {
      details.push({
        action: 'removed',
        item: getItemDisplayName(item, fieldName),
        id: item.id
      });
    }
  });
  
  return { summary, fromDisplay, toDisplay, details };
}

/**
 * Get a display name for an item in an array
 */
function getItemDisplayName(item: any, fieldContext: string): string {
  if (!item || typeof item !== 'object') return String(item);
  
  // Context-specific formatting
  if (fieldContext.toLowerCase().includes('detail')) {
    if (item.categoryName && item.cost) {
      return `${item.categoryName}: ${formatValue(item.cost, 'cost')}`;
    }
  }
  
  if (fieldContext.toLowerCase().includes('category')) {
    if (item.name && item.type) {
      return `${item.name} (${item.type})`;
    }
  }
  
  // Generic fallbacks
  if (item.name) return item.name;
  if (item.title) return item.title;
  if (item.categoryName) return item.categoryName;
  if (item.description) return item.description;
  if (item.email) return item.email;
  if (item.id) return `ID: ${item.id}`;
  
  return "Item";
}

/**
 * Format object changes for display
 */
export function formatObjectChange(from: any, to: any): {
  summary: string;
  fromDisplay: string;
  toDisplay: string;
  changedFields: string[];
} {
  if (!from || !to) {
    return {
      summary: from ? "Object removed" : "Object added",
      fromDisplay: from ? "Object data" : "None",
      toDisplay: to ? "Object data" : "None",
      changedFields: []
    };
  }
  
  const changedFields: string[] = [];
  
  // Compare objects to find changed fields
  const allKeys = new Set([...Object.keys(from), ...Object.keys(to)]);
  
  for (const key of allKeys) {
    if (from[key] !== to[key]) {
      // Skip certain fields that are not user-relevant
      if (!['createdAt', 'updatedAt', 'id'].includes(key)) {
        changedFields.push(formatFieldName(key));
      }
    }
  }
  
  const summary = changedFields.length > 0 
    ? `Modified ${changedFields.length} field${changedFields.length > 1 ? 's' : ''}`
    : "Object updated";
  
  return {
    summary,
    fromDisplay: getObjectDisplayName(from),
    toDisplay: getObjectDisplayName(to),
    changedFields
  };
}

/**
 * Get a display name for an object
 */
function getObjectDisplayName(obj: any): string {
  if (!obj || typeof obj !== 'object') return String(obj);
  
  if (obj.name) return obj.name;
  if (obj.title) return obj.title;
  if (obj.email) return obj.email;
  if (obj.description) return obj.description;
  if (obj.outletCode) return `Outlet ${obj.outletCode}`;
  if (obj.propertyCode) return `Property ${obj.propertyCode}`;
  if (obj.categoryName) return obj.categoryName;
  if (obj.id) return `ID: ${obj.id}`;
  
  return "Object";
}

/**
 * Determine the type of change for better formatting
 */
export function getChangeType(from: any, to: any): 'simple' | 'array' | 'object' {
  if (Array.isArray(from) || Array.isArray(to)) return 'array';
  if ((typeof from === 'object' && from !== null) || (typeof to === 'object' && to !== null)) {
    // Skip Date objects and treat them as simple
    if (from instanceof Date || to instanceof Date) return 'simple';
    return 'object';
  }
  return 'simple';
}

/**
 * Format changes for display in the audit log
 */
export function formatChanges(changes: Record<string, { from: any; to: any }>): FormattedChange[] {
  return Object.entries(changes).map(([field, change]) => {
    const type = getChangeType(change.from, change.to);
    const displayName = formatFieldName(field);
    
    let summary = '';
    let details = '';
    
    switch (type) {
      case 'array':
        const arrayFormat = formatArrayChange(change.from, change.to, field);
        summary = arrayFormat.summary;
        details = arrayFormat.details.length > 0 
          ? arrayFormat.details.map(d => `${d.action}: ${d.item}`).join(', ')
          : '';
        break;
        
      case 'object':
        const objectFormat = formatObjectChange(change.from, change.to);
        summary = objectFormat.summary;
        details = objectFormat.changedFields.length > 0 
          ? `Changed: ${objectFormat.changedFields.join(', ')}`
          : '';
        break;
        
      case 'simple':
      default:
        const fromVal = formatValue(change.from, field);
        const toVal = formatValue(change.to, field);
        summary = `${fromVal} → ${toVal}`;
        break;
    }
    
    return {
      field,
      displayName,
      type,
      from: change.from,
      to: change.to,
      summary,
      details
    };
  });
}