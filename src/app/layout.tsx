"use client"; // Added to use Pathname

// import type { Metadata } from 'next'; // Metadata cannot be exported from Client Components
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { usePathname } from "next/navigation"; // Added
import { useEffect, useState } from "react"; // Added for isMounted pattern

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

  if (!isMounted) {
    // Render a minimal version or null during the very first client render before hydration
    // to ensure server and client match for the conditional part.
    // Or, structure it so the part that depends on pathname is only rendered when isMounted.
    return (
      <html lang="en" suppressHydrationWarning>
        <head>
          <title>Cost Compass</title>
          {/* Default title */}
          <meta
            name="description"
            content="Daily Food and Beverage Cost Monitoring"
          />
          {/* Default description */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="anonymous"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
            rel="stylesheet"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className="font-body antialiased bg-background text-foreground overflow-x-hidden">
          <ThemeProvider>
            <AuthProvider>
              <div className="flex min-h-screen w-full items-center justify-center">
                {children}
              </div>
              <Toaster />
              <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
              />
            </AuthProvider>
          </ThemeProvider>
        </body>
      </html>
    );
  }

  const isAuthPage = pathname === "/login" || pathname === "/signup";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Cost Compass</title>
        {/* Default title, pages can override */}
        <meta
          name="description"
          content="Daily Food and Beverage Cost Monitoring"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased bg-background text-foreground overflow-x-hidden">
        <ThemeProvider>
          <AuthProvider>
            {isAuthPage ? (
              <div className="flex min-h-screen w-full items-center justify-center overflow-x-hidden">
                {children}
              </div>
            ) : (
              <SidebarProvider>
                <div className="flex min-h-screen w-full overflow-x-hidden">
                  <AppSidebar />
                  <div className="flex flex-1 flex-col overflow-x-hidden">
                    <AppHeader />
                    <main className="flex-grow p-4 sm:p-6 lg:p-8 max-w-none w-full overflow-x-hidden">
                      {children}
                    </main>
                    <AppFooter />
                  </div>
                </div>
              </SidebarProvider>
            )}
            <Toaster />
            <ToastContainer
              position="top-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
      <style jsx global>{`
        html,
        body,
        #__next {
          max-width: 100vw;
          overflow-x: hidden !important;
        }
      `}</style>
    </html>
  );
}
