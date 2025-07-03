export interface ColorPalette {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    chart1: string;
    chart2: string;
    chart3: string;
    chart4: string;
    chart5: string;
  };
}

export const colorPalettes: ColorPalette[] = [
  {
    id: 'default',
    name: 'Ocean Blue',
    description: 'Default blue theme with professional appearance',
    colors: {
      primary: '197 71% 53%', // #29ABE2 Vibrant Blue
      secondary: '210 16% 90%', // Light gray
      accent: '120 73% 75%', // #90EE90 Soft Green
      chart1: '197 71% 53%', // Primary Blue
      chart2: '25 80% 55%', // Orange
      chart3: '120 73% 65%', // Green
      chart4: '43 74% 66%', // Yellow
      chart5: '27 87% 67%', // Red-orange
    },
  },
  {
    id: 'emerald',
    name: 'Emerald Green',
    description: 'Fresh green palette perfect for nature-inspired apps',
    colors: {
      primary: '142 76% 36%', // Emerald green
      secondary: '138 76% 97%', // Very light green
      accent: '45 93% 47%', // Golden yellow accent
      chart1: '142 76% 36%', // Primary green
      chart2: '45 93% 47%', // Golden yellow
      chart3: '197 71% 53%', // Blue
      chart4: '25 80% 55%', // Orange
      chart5: '350 89% 60%', // Red
    },
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    description: 'Elegant purple theme with sophisticated appearance',
    colors: {
      primary: '262 83% 58%', // Purple
      secondary: '262 83% 97%', // Very light purple
      accent: '45 93% 47%', // Golden accent
      chart1: '262 83% 58%', // Primary purple
      chart2: '197 71% 53%', // Blue
      chart3: '142 76% 36%', // Green
      chart4: '25 80% 55%', // Orange
      chart5: '350 89% 60%', // Red
    },
  },
  {
    id: 'sunset',
    name: 'Sunset Orange',
    description: 'Warm orange palette inspired by sunset colors',
    colors: {
      primary: '25 95% 53%', // Vibrant orange
      secondary: '25 95% 97%', // Very light orange
      accent: '197 71% 53%', // Blue accent
      chart1: '25 95% 53%', // Primary orange
      chart2: '350 89% 60%', // Red
      chart3: '45 93% 47%', // Yellow
      chart4: '142 76% 36%', // Green
      chart5: '262 83% 58%', // Purple
    },
  },
  {
    id: 'rose',
    name: 'Rose Pink',
    description: 'Soft rose theme with warm and inviting feel',
    colors: {
      primary: '330 81% 60%', // Rose pink
      secondary: '330 81% 97%', // Very light rose
      accent: '142 76% 36%', // Green accent
      chart1: '330 81% 60%', // Primary rose
      chart2: '262 83% 58%', // Purple
      chart3: '197 71% 53%', // Blue
      chart4: '45 93% 47%', // Yellow
      chart5: '25 95% 53%', // Orange
    },
  },
  {
    id: 'slate',
    name: 'Slate Gray',
    description: 'Professional gray theme with modern appearance',
    colors: {
      primary: '215 28% 17%', // Dark slate
      secondary: '215 28% 95%', // Very light slate
      accent: '197 71% 53%', // Blue accent
      chart1: '215 28% 17%', // Primary slate
      chart2: '197 71% 53%', // Blue
      chart3: '142 76% 36%', // Green
      chart4: '25 95% 53%', // Orange
      chart5: '350 89% 60%', // Red
    },
  },
];

export function getColorPalette(id: string): ColorPalette {
  return colorPalettes.find(palette => palette.id === id) || colorPalettes[0];
}