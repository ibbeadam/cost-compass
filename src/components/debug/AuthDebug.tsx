"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function AuthDebug() {
  const { user, userProfile, isAdmin, loading } = useAuth();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const runTests = async () => {
    setIsTesting(true);
    setTestResults([]);
    
    const results: string[] = [];
    
    try {
      // Test 1: Check if user is authenticated
      if (user) {
        results.push(`✅ User authenticated: ${user.email} (UID: ${user.uid})`);
      } else {
        results.push(`❌ User not authenticated`);
        setTestResults(results);
        setIsTesting(false);
        return;
      }

      // Test 2: Check user profile
      if (userProfile) {
        results.push(`✅ User profile found: role=${userProfile.role}, isActive=${userProfile.isActive}`);
      } else {
        results.push(`❌ User profile not found in Firestore`);
      }

      // Test 3: Check admin status
      if (isAdmin) {
        results.push(`✅ User is admin`);
      } else {
        results.push(`❌ User is not admin (role: ${userProfile?.role || 'unknown'})`);
      }

      // Test 4: Test categories collection access
      if (db) {
        try {
          const categoriesSnapshot = await getDocs(query(collection(db, "categories"), where("type", "==", "Food")));
          results.push(`✅ Categories access: ${categoriesSnapshot.size} food categories found`);
        } catch (error: any) {
          results.push(`❌ Categories access failed: ${error.message}`);
        }

        // Test 5: Test outlets collection access
        try {
          const outletsSnapshot = await getDocs(collection(db, "outlets"));
          results.push(`✅ Outlets access: ${outletsSnapshot.size} outlets found`);
        } catch (error: any) {
          results.push(`❌ Outlets access failed: ${error.message}`);
        }

        // Test 6: Test dailyFinancialSummaries collection access
        try {
          const summariesSnapshot = await getDocs(collection(db, "dailyFinancialSummaries"));
          results.push(`✅ Daily summaries access: ${summariesSnapshot.size} summaries found`);
        } catch (error: any) {
          results.push(`❌ Daily summaries access failed: ${error.message}`);
        }
      } else {
        results.push(`❌ Firestore not initialized`);
      }

    } catch (error: any) {
      results.push(`❌ Test error: ${error.message}`);
    }

    setTestResults(results);
    setIsTesting(false);
  };

  if (!user) {
    return null; // Don't show debug panel if not logged in
  }

  return (
    <Card className="w-full max-w-2xl mx-auto mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔧 Authentication Debug Panel
          <Badge variant={isAdmin ? "default" : "secondary"}>
            {isAdmin ? "Admin" : "User"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Auth User:</strong>
            <div className="text-muted-foreground">
              Email: {user.email}<br />
              UID: {user.uid}<br />
              Email Verified: {user.emailVerified ? "Yes" : "No"}
            </div>
          </div>
          <div>
            <strong>Firestore Profile:</strong>
            <div className="text-muted-foreground">
              Role: {userProfile?.role || "Not found"}<br />
              Active: {userProfile?.isActive ? "Yes" : "No"}<br />
              Name: {userProfile?.displayName || "Not set"}
            </div>
          </div>
        </div>

        <Button 
          onClick={runTests} 
          disabled={isTesting}
          className="w-full"
        >
          {isTesting ? "Running Tests..." : "Run Permission Tests"}
        </Button>

        {testResults.length > 0 && (
          <div className="space-y-2">
            <strong>Test Results:</strong>
            <div className="space-y-1">
              {testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <strong>Debug Info:</strong><br />
          • This panel helps diagnose authentication and permission issues<br />
          • If tests fail, check your Firestore user document matches your Auth UID<br />
          • Ensure the user document has role: "admin" and isActive: true
        </div>
      </CardContent>
    </Card>
  );
} 