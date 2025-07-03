"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Palette, Check } from 'lucide-react';
import { colorPalettes } from '@/lib/color-palettes';

export function ColorPaletteSelector() {
  const { colorPalette, setColorPalette } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Color Palette
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup 
          value={colorPalette.id} 
          onValueChange={setColorPalette} 
          className="grid gap-4"
        >
          {colorPalettes.map((palette) => (
            <div
              key={palette.id}
              className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <RadioGroupItem value={palette.id} id={palette.id} />
              <div className="flex items-center gap-3 flex-1">
                <div className="flex items-center gap-1">
                  {/* Color preview circles */}
                  <div 
                    className="w-4 h-4 rounded-full border border-border"
                    style={{ backgroundColor: `hsl(${palette.colors.primary})` }}
                  />
                  <div 
                    className="w-4 h-4 rounded-full border border-border"
                    style={{ backgroundColor: `hsl(${palette.colors.accent})` }}
                  />
                  <div 
                    className="w-4 h-4 rounded-full border border-border"
                    style={{ backgroundColor: `hsl(${palette.colors.chart2})` }}
                  />
                </div>
                <div className="grid gap-1 flex-1">
                  <Label htmlFor={palette.id} className="text-sm font-medium cursor-pointer">
                    {palette.name}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {palette.description}
                  </p>
                </div>
                {colorPalette.id === palette.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}

export function ColorPalettePreview() {
  const { colorPalette } = useTheme();

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <div 
          className="w-3 h-3 rounded-full border border-border"
          style={{ backgroundColor: `hsl(${colorPalette.colors.primary})` }}
        />
        <div 
          className="w-3 h-3 rounded-full border border-border"
          style={{ backgroundColor: `hsl(${colorPalette.colors.accent})` }}
        />
        <div 
          className="w-3 h-3 rounded-full border border-border"
          style={{ backgroundColor: `hsl(${colorPalette.colors.chart2})` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">
        {colorPalette.name}
      </span>
    </div>
  );
}