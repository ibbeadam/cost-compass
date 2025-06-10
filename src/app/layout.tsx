
"use client"; // Added to use Pathname

// import type { Metadata } from 'next'; // Metadata cannot be exported from Client Components
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import {
  SidebarProvider,
} from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppFooter } from '@/components/layout/AppFooter';
import { AuthProvider } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation'; // Added
import { useEffect, useState } from 'react'; // Added for isMounted pattern

// export const metadata: Metadata = { // Cannot export metadata from a Client Component
//   title: 'Cost Compass',
//   description: 'Daily Food and Beverage Cost Monitoring',
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Basic structure for initial render to minimize layout shifts or hydration issues
  // if full conditional rendering based on pathname is too complex for initial render.
  // Here, we ensure AuthProvider and Toaster are always present.
  const baseStructure = (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground">
        <AuthProvider>
          {/* Content will be filled conditionally below */}
        </AuthProvider>
      </body>
    </html>
  );

  if (!isMounted) {
    // Render a minimal version or null during the very first client render before hydration
    // to ensure server and client match for the conditional part.
    // Or, structure it so the part that depends on pathname is only rendered when isMounted.
    return (
      <html lang="en" suppressHydrationWarning>
        <head><title>Cost Compass</title>{/* Default title */}
          <meta name="description" content="Daily Food and Beverage Cost Monitoring" />{/* Default description */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
          <link href="https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500&display=swap" rel="stylesheet" />
        </head>
        <body className="font-body antialiased bg-background text-foreground">
          <AuthProvider>
            <div className="flex min-h-screen w-full items-center justify-center">
              {/* Minimal loading state or just children for auth pages */}
              {children}
            </div>
            <Toaster />
          </AuthProvider>
        </body>
      </html>
    );
  }

  const isAuthPage = pathname === '/login' || pathname === '/signup';

  return (
    <html lang="en" suppressHydrationWarning>
      <head><title>Cost Compass</title>{/* Default title, pages can override */}
        <meta name="description" content="Daily Food and Beverage Cost Monitoring" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground">
        <AuthProvider>
          {isAuthPage ? (
            <div className="flex min-h-screen w-full items-center justify-center">
              {children}
            </div>
          ) : (
            <SidebarProvider>
              <div className="flex min-h-screen w-full">
                <AppSidebar />
                <div className="flex flex-1 flex-col"> 
                  <AppHeader />
                  <main className="flex-grow p-4 sm:p-6 lg:p-8 max-w-none w-full">
                    {children}
                  </main>
                  <AppFooter />
                </div>
              </div>
            </SidebarProvider>
          )}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
