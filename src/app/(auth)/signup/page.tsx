
"use client";

import { Compass, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SignupDisabledPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="absolute top-8 left-8 flex items-center gap-2 text-primary">
        <Compass size={32} />
        <span className="text-2xl font-headline font-semibold text-foreground">
          Cost Compass
        </span>
      </div>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline flex items-center justify-center">
            <ShieldAlert className="mr-2 h-7 w-7 text-destructive" /> Registration Disabled
          </CardTitle>
          <CardDescription>Public user registration is currently not available.</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            To obtain an account and login credentials, please contact your system administrator.
          </p>
          <Button asChild variant="outline">
            <Link href="/login">
              Back to Login
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
