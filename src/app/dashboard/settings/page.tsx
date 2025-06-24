
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ColorPaletteSelector } from "@/components/ui/color-palette-selector";

export default function GeneralSettingsPage() {
  return (
    <div className="space-y-6">
      <ThemeToggle />
      
      <ColorPaletteSelector />
      
      <Card className="shadow-lg bg-card">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Other Settings</CardTitle>
          <CardDescription>
            Additional settings will be available in future updates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mt-2">
            <h3 className="text-lg font-medium text-foreground mb-2">Coming Soon</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>User Profile Management</li>
              <li>Notification Preferences</li>
              <li>Data Export/Import Options</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
