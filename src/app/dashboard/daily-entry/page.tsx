
import DailyEntryForm from "@/components/dashboard/daily-entry/DailyEntryForm";
import { Header } from "@/components/layout/Header"; // Assuming you might want a consistent header
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata = {
  title: "Daily Financial Entry | Cost Compass",
};

export default function DailyEntryPage() {
  // You might want to fetch existing data for a selected date here in the future
  // For now, we'll pass null to indicate a new entry.
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <Card className="shadow-lg bg-card max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Daily Hotel Financial Entry</CardTitle>
            <CardDescription>
              Enter the financial data for the selected date. Ensure all figures are accurate.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DailyEntryForm />
          </CardContent>
        </Card>
      </main>
      <footer className="text-center p-4 text-sm text-muted-foreground border-t mt-auto">
        © {new Date().getFullYear()} Cost Compass. All rights reserved.
      </footer>
    </div>
  );
}
