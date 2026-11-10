# MY WORKSPACE — Personal Work OS

Osobna aplikacija za produktivnost (zadaci, kalendar, projekti, bilješke, financije).
React + TypeScript + Tailwind CSS + Supabase. Instalira se kao PWA.

- Izvorni kod: `src/`
- Gradnja: `npm install && node build.mjs` → mapa `dist/`
- Objava: GitHub Pages poslužuje granu `gh-pages` (sadržaj mape `dist/`).

Javni Supabase ključ u `src/config.ts` je namjerno javan; podatke štite RLS pravila po korisniku.
