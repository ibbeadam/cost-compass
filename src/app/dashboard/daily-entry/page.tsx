
import DailyEntryForm from "@/components/dashboard/daily-entry/DailyEntryForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata = {
  title: "Daily Financial Entry | Cost Compass",
};

export default function DailyEntryPage() {
  return (
    <div className="flex flex-col flex-grow">
        <Card className="shadow-lg bg-card max-w-4xl mx-auto w-full">
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
    </div>
  );
}
