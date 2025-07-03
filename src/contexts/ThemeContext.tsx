"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ColorPalette, getColorPalette } from '@/lib/color-palettes';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  systemTheme: 'light' | 'dark';
  colorPalette: ColorPalette;
  setColorPalette: (paletteId: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system');
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');
  const [colorPalette, setColorPaletteState] = useState<ColorPalette>(getColorPalette('default'));

  useEffect(() => {
    // Get saved theme from localStorage or default to system
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setTheme(savedTheme);
    }

    // Get saved color palette from localStorage or default to 'default'
    const savedPalette = localStorage.getItem('colorPalette');
    if (savedPalette) {
      setColorPaletteState(getColorPalette(savedPalette));
    }

    // Detect system theme preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    // Listen for system theme changes
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    // Apply theme based on selection
    if (theme === 'system') {
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
    
    // Save theme preference
    localStorage.setItem('theme', theme);
  }, [theme, systemTheme]);

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Apply color palette CSS variables
    root.style.setProperty('--primary', colorPalette.colors.primary);
    root.style.setProperty('--secondary', colorPalette.colors.secondary);
    root.style.setProperty('--accent', colorPalette.colors.accent);
    root.style.setProperty('--chart-1', colorPalette.colors.chart1);
    root.style.setProperty('--chart-2', colorPalette.colors.chart2);
    root.style.setProperty('--chart-3', colorPalette.colors.chart3);
    root.style.setProperty('--chart-4', colorPalette.colors.chart4);
    root.style.setProperty('--chart-5', colorPalette.colors.chart5);
    
    // Update related color variables to maintain consistency
    root.style.setProperty('--ring', colorPalette.colors.primary); // Focus rings use primary color
    root.style.setProperty('--secondary-foreground', colorPalette.colors.primary); // Secondary text uses primary
    
    // Update sidebar colors to use the selected palette
    root.style.setProperty('--sidebar-primary', colorPalette.colors.primary);
    root.style.setProperty('--sidebar-accent', colorPalette.colors.accent);
    root.style.setProperty('--sidebar-ring', colorPalette.colors.primary);
    
    // Save color palette preference
    localStorage.setItem('colorPalette', colorPalette.id);
  }, [colorPalette]);

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  const handleSetColorPalette = (paletteId: string) => {
    setColorPaletteState(getColorPalette(paletteId));
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme: handleSetTheme, 
      systemTheme, 
      colorPalette, 
      setColorPalette: handleSetColorPalette 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}