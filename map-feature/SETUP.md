# Setup

Standalone NYC Civic Signal app: the neighborhood-signals map (with a self-driving guided tour), News, and Community Stories. No backend or database to run — it reads a hosted API. Set two values, run it.

## Run it

Needs **Node 20+**.

```bash
npm install
npm run dev          # http://localhost:3000
```

If there's no `.env.local`, create one from the template and paste these two values:

```bash
cp .env.example .env.local
```

```ini
# .env.local
CIVIC_SIGNAL_API_BASE_URL=https://vngle-api-zimvnfxh7q-uc.a.run.app
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token_here
```

Restart `npm run dev` after editing `.env.local`.

> **Upgrading from an older copy of this export?** The backend URL variable was renamed from `NEXT_PUBLIC_API_BASE_URL` to `CIVIC_SIGNAL_API_BASE_URL` (it's server-only now — it never reaches the browser). Rename the key in your `.env.local`.
>
> The default URL is the **production** backend — the same host the main Vngle site reads. If you're upgrading from an earlier snapshot, replace any old API URL with this one.

## Deploy

```bash
npm run build
npm start
```

Runs on any Node host (Vercel, Netlify, Cloud Run). Set the same two env vars there.

## Put it on your site

- **Subdomain (easiest):** deploy it, point `map.yoursite.org` at it, link to it.
- **Iframe:**
  ```html
  <iframe src="https://map.yoursite.org" style="width:100%;height:800px;border:0"></iframe>
  ```

## If something's off

| Problem | Fix |
|---|---|
| "Map needs a Mapbox token" | Add `NEXT_PUBLIC_MAPBOX_TOKEN` to `.env.local`, restart the dev server. |
| Map is blank / tiles 403 | Add your domain to the token (Mapbox dashboard → Tokens → URL restrictions). |
| Address/ZIP search returns nothing | The search uses the same Mapbox token — make sure it's set and its domain restriction allows the Geocoding API. |
| Empty data panels | Check `CIVIC_SIGNAL_API_BASE_URL`. Test: `curl https://vngle-api-zimvnfxh7q-uc.a.run.app/health` → `{"status":"ok"}` |
