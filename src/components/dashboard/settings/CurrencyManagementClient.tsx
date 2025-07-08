"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PlusCircle,
  Edit,
  Trash2,
  AlertTriangle,
  DollarSign,
  Star,
  StarOff,
  Eye,
  EyeOff,
  Search,
  Globe,
  Settings,
  CheckCircle,
  XCircle
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/lib/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { RecordsPerPageSelector } from "@/components/ui/records-per-page-selector";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { Currency, CreateCurrencyData, UpdateCurrencyData } from "@/actions/currencyActions";

// Common locales for currency formatting
const COMMON_LOCALES = [
  { code: "en-US", name: "English (US)", example: "$1,234.56" },
  { code: "en-GB", name: "English (UK)", example: "£1,234.56" },
  { code: "de-DE", name: "German", example: "1.234,56 €" },
  { code: "fr-FR", name: "French", example: "1 234,56 €" },
  { code: "ja-JP", name: "Japanese", example: "¥1,235" },
  { code: "zh-CN", name: "Chinese (Simplified)", example: "¥1,234.56" },
  { code: "ar-SA", name: "Arabic (Saudi)", example: "١٬٢٣٤٫٥٦ ﷼" },
  { code: "es-ES", name: "Spanish", example: "1.234,56 €" },
  { code: "pt-BR", name: "Portuguese (Brazil)", example: "R$ 1.234,56" },
  { code: "ru-RU", name: "Russian", example: "1 234,56 ₽" }
];

interface CurrencyFormData {
  code: string;
  name: string;
  symbol: string;
  displayName: string;
  decimalPlaces: number;
  exchangeRate?: string;
  locale?: string;
  isActive: boolean;
}

const initialFormData: CurrencyFormData = {
  code: "",
  name: "",
  symbol: "",
  displayName: "",
  decimalPlaces: 2,
  exchangeRate: "",
  locale: "en-US",
  isActive: true
};

export default function CurrencyManagementClient() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<CurrencyFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  
  // Filter and pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  const [filterSystemCurrency, setFilterSystemCurrency] = useState<boolean | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Load currencies
  const loadCurrencies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('searchTerm', searchTerm);
      if (filterActive !== undefined) params.append('isActive', filterActive.toString());
      if (filterSystemCurrency !== undefined) params.append('isSystemCurrency', filterSystemCurrency.toString());
      
      const response = await fetch(`/api/currencies/manage?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch currencies');
      }
      
      const { currencies } = await response.json();
      setCurrencies(currencies);
    } catch (err) {
      console.error("Failed to load currencies:", err);
      setError("Failed to load currencies. Please try again.");
      showToast("error", "Failed to load currencies");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterActive, filterSystemCurrency]);

  useEffect(() => {
    loadCurrencies();
  }, [loadCurrencies]);

  // Form validation
  const validateForm = (data: CurrencyFormData): Record<string, string> => {
    const errors: Record<string, string> = {};
    
    if (!data.code.trim()) {
      errors.code = "Currency code is required";
    } else if (!/^[A-Z]{3}$/.test(data.code.toUpperCase())) {
      errors.code = "Currency code must be exactly 3 uppercase letters";
    }
    
    if (!data.name.trim()) {
      errors.name = "Currency name is required";
    }
    
    if (!data.symbol.trim()) {
      errors.symbol = "Currency symbol is required";
    }
    
    if (!data.displayName.trim()) {
      errors.displayName = "Display name is required";
    }
    
    if (data.decimalPlaces < 0 || data.decimalPlaces > 4) {
      errors.decimalPlaces = "Decimal places must be between 0 and 4";
    }
    
    if (data.exchangeRate && data.exchangeRate.trim()) {
      const rate = parseFloat(data.exchangeRate);
      if (isNaN(rate) || rate <= 0) {
        errors.exchangeRate = "Exchange rate must be a positive number";
      }
    }
    
    return errors;
  };

  // Handle form submission
  const handleSubmit = async () => {
    const errors = validateForm(formData);
    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      return;
    }
    
    try {
      setSubmitting(true);
      
      const submitData: CreateCurrencyData | UpdateCurrencyData = {
        code: formData.code.toUpperCase(),
        name: formData.name,
        symbol: formData.symbol,
        displayName: formData.displayName,
        decimalPlaces: formData.decimalPlaces,
        exchangeRate: formData.exchangeRate ? parseFloat(formData.exchangeRate) : undefined,
        locale: formData.locale || undefined,
        isActive: formData.isActive
      };
      
      if (editingCurrency) {
        const response = await fetch('/api/currencies/manage', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingCurrency.id, ...submitData })
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update currency');
        }
        
        showToast("success", "Currency updated successfully");
        setShowEditDialog(false);
      } else {
        const response = await fetch('/api/currencies/manage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData)
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create currency');
        }
        
        showToast("success", "Currency created successfully");
        setShowCreateDialog(false);
      }
      
      // Reset form and reload data
      setFormData(initialFormData);
      setEditingCurrency(null);
      await loadCurrencies();
      
    } catch (err) {
      console.error("Failed to save currency:", err);
      showToast("error", (err as Error).message || "Failed to save currency");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async (currency: Currency) => {
    try {
      const response = await fetch('/api/currencies/manage', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currency.id })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete currency');
      }
      
      showToast("success", "Currency deleted successfully");
      await loadCurrencies();
    } catch (err) {
      console.error("Failed to delete currency:", err);
      showToast("error", (err as Error).message || "Failed to delete currency");
    }
  };

  // Handle set default
  const handleSetDefault = async (currency: Currency) => {
    try {
      const response = await fetch('/api/currencies/set-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currency.id })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to set default currency');
      }
      
      showToast("success", `${currency.code} set as default currency`);
      await loadCurrencies();
    } catch (err) {
      console.error("Failed to set default currency:", err);
      showToast("error", (err as Error).message || "Failed to set default currency");
    }
  };

  // Open edit dialog
  const openEditDialog = (currency: Currency) => {
    setEditingCurrency(currency);
    setFormData({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      displayName: currency.displayName,
      decimalPlaces: currency.decimalPlaces,
      exchangeRate: currency.exchangeRate?.toString() || "",
      locale: currency.locale || "en-US",
      isActive: currency.isActive
    });
    setFormErrors({});
    setShowEditDialog(true);
  };

  // Open create dialog
  const openCreateDialog = () => {
    setEditingCurrency(null);
    setFormData(initialFormData);
    setFormErrors({});
    setShowCreateDialog(true);
  };

  // Filter and paginate currencies
  const filteredCurrencies = currencies;
  const totalPages = Math.ceil(filteredCurrencies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCurrencies = filteredCurrencies.slice(startIndex, startIndex + itemsPerPage);

  // Format currency preview
  const formatCurrencyPreview = (currency: Currency) => {
    try {
      const amount = 1234.56;
      const locale = currency.locale || "en-US";
      
      // Try to format with Intl.NumberFormat
      const formatter = new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency.code,
        minimumFractionDigits: currency.decimalPlaces,
        maximumFractionDigits: currency.decimalPlaces
      });
      
      return formatter.format(amount);
    } catch (error) {
      // Fallback formatting if currency code is not supported
      const amount = (1234.56).toFixed(currency.decimalPlaces);
      return `${currency.symbol}${amount}`;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Currencies</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={loadCurrencies}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Currency Management</h1>
          <p className="text-gray-600">Manage system and custom currencies</p>
        </div>
        <Button onClick={openCreateDialog} className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4" />
          Add Currency
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search currencies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={filterActive?.toString() || "all"} onValueChange={(value) => 
            setFilterActive(value === "all" ? undefined : value === "true")
          }>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterSystemCurrency?.toString() || "all"} onValueChange={(value) => 
            setFilterSystemCurrency(value === "all" ? undefined : value === "true")
          }>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="true">System</SelectItem>
              <SelectItem value="false">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredCurrencies.length)} of{" "}
          {filteredCurrencies.length} currencies
        </p>
        <RecordsPerPageSelector
          value={itemsPerPage}
          onChange={setItemsPerPage}
          options={[10, 25, 50, 100]}
        />
      </div>

      {/* Currency table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Currency</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Symbol</TableHead>
              <TableHead>Preview</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedCurrencies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <DollarSign className="h-8 w-8 text-gray-400" />
                    <p className="text-gray-600">No currencies found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedCurrencies.map((currency) => (
                <TableRow key={currency.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{currency.name}</div>
                      <div className="text-sm text-gray-500">{currency.displayName}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {currency.code}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-lg">{currency.symbol}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      {formatCurrencyPreview(currency)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={currency.isSystemCurrency ? "default" : "secondary"}>
                      {currency.isSystemCurrency ? "System" : "Custom"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {currency.isActive ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className={currency.isActive ? "text-green-600" : "text-red-600"}>
                        {currency.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {currency.isDefault ? (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="text-yellow-600">Default</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {format(new Date(currency.createdAt), "MMM d, yyyy")}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!currency.isDefault && currency.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(currency)}
                          className="flex items-center gap-1"
                        >
                          <Star className="h-4 w-4" />
                          Set Default
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(currency)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      
                      {!currency.isSystemCurrency && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex items-center gap-1 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Currency</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {currency.name} ({currency.code})? 
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(currency)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || showEditDialog} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false);
          setShowEditDialog(false);
          setFormData(initialFormData);
          setFormErrors({});
          setEditingCurrency(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCurrency ? "Edit Currency" : "Add New Currency"}
            </DialogTitle>
            <DialogDescription>
              {editingCurrency 
                ? "Update currency information and settings"
                : "Create a new custom currency for your system"
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Currency Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="USD"
                  maxLength={3}
                  className={cn(formErrors.code && "border-red-500")}
                  disabled={editingCurrency?.isSystemCurrency}
                />
                {formErrors.code && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.code}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="symbol">Symbol *</Label>
                <Input
                  id="symbol"
                  value={formData.symbol}
                  onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value }))}
                  placeholder="$"
                  className={cn(formErrors.symbol && "border-red-500")}
                  disabled={editingCurrency?.isSystemCurrency}
                />
                {formErrors.symbol && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.symbol}</p>
                )}
              </div>
            </div>
            
            <div>
              <Label htmlFor="name">Currency Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="US Dollar"
                className={cn(formErrors.name && "border-red-500")}
                disabled={editingCurrency?.isSystemCurrency}
              />
              {formErrors.name && (
                <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="displayName">Display Name *</Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="USD ($)"
                className={cn(formErrors.displayName && "border-red-500")}
                disabled={editingCurrency?.isSystemCurrency}
              />
              {formErrors.displayName && (
                <p className="text-sm text-red-500 mt-1">{formErrors.displayName}</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="decimalPlaces">Decimal Places</Label>
                <Select 
                  value={formData.decimalPlaces.toString()} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, decimalPlaces: parseInt(value) }))}
                  disabled={editingCurrency?.isSystemCurrency}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 (¥1,235)</SelectItem>
                    <SelectItem value="1">1 ($123.5)</SelectItem>
                    <SelectItem value="2">2 ($123.45)</SelectItem>
                    <SelectItem value="3">3 (د.ك123.456)</SelectItem>
                    <SelectItem value="4">4 ($123.4567)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="exchangeRate">Exchange Rate (vs USD)</Label>
                <Input
                  id="exchangeRate"
                  type="number"
                  step="0.000001"
                  value={formData.exchangeRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, exchangeRate: e.target.value }))}
                  placeholder="1.0"
                  className={cn(formErrors.exchangeRate && "border-red-500")}
                />
                {formErrors.exchangeRate && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.exchangeRate}</p>
                )}
              </div>
            </div>
            
            <div>
              <Label htmlFor="locale">Locale for Formatting</Label>
              <Select 
                value={formData.locale} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, locale: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_LOCALES.map((locale) => (
                    <SelectItem key={locale.code} value={locale.code}>
                      <div className="flex items-center gap-2">
                        <span>{locale.name}</span>
                        <span className="text-sm text-gray-500">({locale.example})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
            
            {editingCurrency?.isSystemCurrency && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">System Currency</span>
                </div>
                <p className="text-sm text-blue-600 mt-1">
                  This is a system currency. Only status, exchange rate, and locale can be modified.
                </p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setShowEditDialog(false);
                setFormData(initialFormData);
                setFormErrors({});
                setEditingCurrency(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Saving..." : editingCurrency ? "Update Currency" : "Create Currency"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}