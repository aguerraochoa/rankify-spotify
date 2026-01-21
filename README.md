# Rankify

A music ranking app built with Next.js, TypeScript, and Tailwind CSS. Rank your favorite songs with precision using binary insertion comparison algorithms.

## Features

- 🎵 **Song Ranker**: Rank songs using binary insertion comparison flow
- 📀 **Album Selection**: Search and select albums from MusicBrainz
- 📊 **Saved Rankings**: View, edit, and manage your saved rankings
- 🖼️ **Receipt-Style Export**: Download your rankings as beautiful PNG images
- 🎨 **Modern UI**: Clean, responsive design with dark mode support
- 🔐 **Authentication**: Secure user authentication with Supabase

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Music Data**: MusicBrainz API & Cover Art Archive

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd rankify
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run database migrations:
Set up your Supabase database using the schema in `supabase/schema.sql`

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
rankify/
├── app/              # Next.js app router pages
├── components/       # React components
├── lib/              # Utility functions and helpers
│   ├── db/          # Database functions
│   ├── musicbrainz/ # MusicBrainz API client
│   ├── pdf/         # PDF/image generation
│   ├── ranking/     # Ranking algorithms
│   └── supabase/    # Supabase client setup
└── supabase/        # Database schema and migrations
```

## License

MIT

