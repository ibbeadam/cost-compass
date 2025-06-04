// src/components/layout/AppFooter.tsx

export function AppFooter() {
  return (
    <footer className="text-center p-4 text-sm text-muted-foreground border-t border-border mt-auto">
      © {new Date().getFullYear()} Cost Compass. All rights reserved.
    </footer>
  );
}
