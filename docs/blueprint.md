# **App Name**: Cost Compass

## Core Features:

- Dashboard: Dashboard View: Displays a date picker, outlet selector, and a daily summary table with Food Revenue, Food Cost, Food Cost %, Beverage Revenue, Beverage Cost, and Beverage Cost %.
- Drill-down: Drill-down View: Displays items transferred to the selected outlet on the selected date, including Item, Category (Food/Beverage), Quantity, Unit Cost, and Total Cost.
- Data Export: Export Functionality: Provides a button to export the daily summary table data in Excel format.
- Chart Display: Chart Visualization: Toggles between a daily bar chart showing Food & Beverage cost % per outlet and a line chart showing the daily trend of Food/Bev cost % over the past month.
- Anomaly Alerts: Cost Fluctuation Detection: Leverages a generative AI tool to monitor daily costs and detect anomalous spikes or dips outside expected ranges. The AI flags unusual patterns for review.
- Device Compatibility: Responsive Design: Ensures the application is accessible and usable on various devices, including desktops, tablets, and smartphones.

## Style Guidelines:

- Primary color: Vibrant blue (#29ABE2) to evoke trust and analytical precision.
- Background color: Light gray (#F0F2F5) for a clean and neutral backdrop.
- Accent color: Soft green (#90EE90) to highlight positive trends and key metrics.
- Body and headline font: 'Inter' (sans-serif) for a modern, readable, and neutral design.
- Code font: 'Source Code Pro' for displaying data values.
- Use clear and concise icons from a standard library (e.g., FontAwesome or Material Icons) to represent data and actions.
- Emphasize a clean, well-organized layout using Tailwind CSS grid and flexbox to ensure information is easily digestible. Data tables should be prominent and clearly labeled.
- Subtle transitions for loading data and updating charts to provide a smooth user experience.