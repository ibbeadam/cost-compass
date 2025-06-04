
// This page's functionality has been moved to more specific modules like /dashboard/food-cost
// This file can be removed or kept as a placeholder.
// For now, it will export an empty object to avoid build issues if accidentally imported.

export default function DailyEntriesPage_DEPRECATED() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Daily Entry (Deprecated)</h1>
      <p className="text-muted-foreground">
        This general daily entry module has been replaced by specific food and beverage cost entry modules.
        Please use the navigation links for "Food Cost Entries" or "Beverage Cost Entries".
      </p>
    </div>
  );
}

export const metadata = {
  title: "Daily Entry (Deprecated) | Cost Compass",
};
