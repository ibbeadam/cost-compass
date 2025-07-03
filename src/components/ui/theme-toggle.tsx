"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Monitor, Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();

  const themeOptions = [
    {
      value: 'light',
      label: 'Light',
      description: 'Light mode with bright colors',
      icon: Sun,
    },
    {
      value: 'dark',
      label: 'Dark',
      description: 'Dark mode with darker colors',
      icon: Moon,
    },
    {
      value: 'system',
      label: 'System',
      description: `Follow system preference (currently ${systemTheme})`,
      icon: Monitor,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          Theme Preferences
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup value={theme} onValueChange={setTheme} className="grid gap-4">
          {themeOptions.map((option) => {
            const IconComponent = option.icon;
            return (
              <div
                key={option.value}
                className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <RadioGroupItem value={option.value} id={option.value} />
                <div className="flex items-center gap-2 flex-1">
                  <IconComponent className="h-4 w-4" />
                  <div className="grid gap-1">
                    <Label htmlFor={option.value} className="text-sm font-medium cursor-pointer">
                      {option.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}

export function ThemeToggleButton() {
  const { theme, setTheme } = useTheme();

  const handleToggle = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-4 w-4" />;
      case 'dark':
        return <Moon className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      title={`Current theme: ${theme}`}
    >
      {getIcon()}
    </Button>
  );
}