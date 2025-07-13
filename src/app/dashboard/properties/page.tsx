import PropertyManagementClient from "@/components/property/PropertyManagementClient";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
export const metadata = {
  title: "Properties | Cost Compass",
  description: "Manage your properties and their settings.",
};

export default function PropertiesPage() {
  return (
    <PermissionGate 
      permissions={["properties.read", "properties.view_all", "properties.view_own"]}
      requireAll={false}
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-muted-foreground">Access Denied</h2>
            <p className="text-sm text-muted-foreground mt-2">
              You don't have permission to access property management.
            </p>
          </div>
        </div>
      }
    >
      <div className="flex flex-col flex-grow w-full">
        <Card className="shadow-lg bg-card w-full">
        <CardHeader>
          <h1 className="text-2xl font-bold tracking-tight">Properties</h1>
          <p className="text-muted-foreground">
            Manage your properties and assign outlets to them.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-6">
            <PropertyManagementClient />
          </div>
        </CardContent>
        </Card>
      </div>
    </PermissionGate>
  );
}