"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

export function CategoryDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDebug = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const results: any = {};

      // Test 1: Get all categories
      console.log("🔍 Testing all categories...");
      const allCategoriesSnapshot = await getDocs(collection(db!, "categories"));
      results.allCategories = {
        count: allCategoriesSnapshot.size,
        documents: allCategoriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      };

      // Test 2: Test food categories query
      console.log("🔍 Testing food categories query...");
      try {
        const foodQuery = query(collection(db!, "categories"), where("type", "==", "Food"), orderBy("name", "asc"));
        const foodSnapshot = await getDocs(foodQuery);
        results.foodCategories = {
          count: foodSnapshot.size,
          documents: foodSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
        };
      } catch (foodError: any) {
        results.foodCategories = {
          error: foodError.message,
          code: foodError.code
        };
      }

      // Test 3: Test beverage categories query
      console.log("🔍 Testing beverage categories query...");
      try {
        const beverageQuery = query(collection(db!, "categories"), where("type", "==", "Beverage"), orderBy("name", "asc"));
        const beverageSnapshot = await getDocs(beverageQuery);
        results.beverageCategories = {
          count: beverageSnapshot.size,
          documents: beverageSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
        };
      } catch (beverageError: any) {
        results.beverageCategories = {
          error: beverageError.message,
          code: beverageError.code
        };
      }

      // Test 4: Check for categories without type field
      console.log("🔍 Checking for categories without type field...");
      const categoriesWithoutType = results.allCategories.documents.filter((doc: any) => !doc.type);
      results.categoriesWithoutType = {
        count: categoriesWithoutType.length,
        documents: categoriesWithoutType
      };

      setDebugInfo(results);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runDebug();
  }, []);

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔧 Category Debug Panel
            <Loader2 className="h-4 w-4 animate-spin" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading debug information...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-4xl mx-auto mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            🔧 Category Debug Panel
            <AlertTriangle className="h-4 w-4" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!debugInfo) {
    return null;
  }

  return (
    <Card className="w-full max-w-4xl mx-auto mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔧 Category Debug Panel
          <Button onClick={runDebug} size="sm" variant="outline">
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{debugInfo.allCategories.count}</div>
            <div className="text-sm text-muted-foreground">Total Categories</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {debugInfo.foodCategories.count || 0}
            </div>
            <div className="text-sm text-muted-foreground">Food Categories</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {debugInfo.beverageCategories.count || 0}
            </div>
            <div className="text-sm text-muted-foreground">Beverage Categories</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {debugInfo.categoriesWithoutType.count}
            </div>
            <div className="text-sm text-muted-foreground">Missing Type</div>
          </div>
        </div>

        {/* Issues */}
        {debugInfo.foodCategories.error && (
          <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
            <h3 className="font-semibold text-destructive mb-2">❌ Food Categories Query Error</h3>
            <p className="text-sm">Error: {debugInfo.foodCategories.error}</p>
            <p className="text-sm">Code: {debugInfo.foodCategories.code}</p>
          </div>
        )}

        {debugInfo.categoriesWithoutType.count > 0 && (
          <div className="p-4 bg-orange-100 border border-orange-300 rounded-lg">
            <h3 className="font-semibold text-orange-800 mb-2">⚠️ Categories Missing Type Field</h3>
            <div className="space-y-1">
              {debugInfo.categoriesWithoutType.documents.map((doc: any, index: number) => (
                <div key={index} className="text-sm">
                  • {doc.name} (ID: {doc.id})
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Categories */}
        <div>
          <h3 className="font-semibold mb-2">📋 All Categories in Database</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {debugInfo.allCategories.documents.map((doc: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <div>
                  <span className="font-medium">{doc.name}</span>
                  {doc.type && (
                    <Badge variant={doc.type === 'Food' ? 'default' : 'secondary'} className="ml-2">
                      {doc.type}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  ID: {doc.id}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">💡 Recommendations</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            {debugInfo.foodCategories.error && (
              <li>• The food categories query is failing. Check Firestore security rules.</li>
            )}
            {debugInfo.categoriesWithoutType.count > 0 && (
              <li>• Some categories are missing the 'type' field. Add 'Food' or 'Beverage' to these categories.</li>
            )}
            {debugInfo.foodCategories.count === 0 && !debugInfo.foodCategories.error && (
              <li>• No food categories found. Create categories with type: 'Food'.</li>
            )}
            {debugInfo.foodCategories.count > 0 && (
              <li>• ✅ Food categories are available. The dashboard should work.</li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
} 