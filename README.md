# Autonomous Medical Drone Dashboard

A real-time monitoring and control dashboard for autonomous medical delivery drones, built by a university engineering team.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Backend / Auth:** Supabase
- **Maps:** Leaflet / React-Leaflet
- **Forms:** React Hook Form + Zod
- **Icons:** Lucide React
- **Utilities:** date-fns

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/Drgn99/medical-drone-dashboard.git
   cd medical-drone-dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.local.example .env.local
   ```
   Then fill in your Supabase project URL and anon key in `.env.local`.

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.
