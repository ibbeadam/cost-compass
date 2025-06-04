
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function GeneralSettingsPage() {
  return (
    <Card className="shadow-lg bg-card">
      <CardHeader>
        <CardTitle className="font-headline text-xl">General Settings</CardTitle>
        <CardDescription>
          Manage your general application settings here. More options will be available in future updates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Currently, general settings are minimal. Specific configurations for features like Outlets are managed in their own sections.
        </p>
        {/* Placeholder for future general settings */}
         <div className="mt-6">
          <h3 className="text-lg font-medium text-foreground mb-2">Future Settings Placeholder</h3>
           <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>User Profile Management (if not under a dedicated Profile section)</li>
            <li>Notification Preferences</li>
            <li>Theme or Appearance Settings</li>
            <li>Data Export/Import Options</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
