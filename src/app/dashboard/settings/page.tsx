
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Building } from "lucide-react";

export default function SettingsPage() {
  return (
    <div>
      <p className="text-muted-foreground mb-6">Manage your application settings here.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/dashboard/settings/outlets">
          <Button variant="outline" className="w-full h-24 text-base sm:text-lg justify-start p-6">
            <Building className="mr-4 h-8 w-8" />
            Manage Outlets
          </Button>
        </Link>
        {/* Add more settings links here as features are built */}
      </div>
    </div>
  );
}

