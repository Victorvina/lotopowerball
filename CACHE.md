# Cache Strategy — LotoPowerball

This document explains how `_headers` controls caching for the site, and what to do when you update files but don't see changes.

## Why we don't use `immutable`

`Cache-Control: immutable` tells browsers and CDNs: "this file will never change at this URL, never refetch it." This is only safe when filenames include a content hash (e.g. `main.abc123.js`).

Our files don't have hashes — `main.js` is always called `main.js`. If we use `immutable`, then once Cloudflare caches an old version, it serves that old version for the cache lifetime (we had 1 year) even after we push updates.

The fix: use `max-age` + `stale-while-revalidate` instead.

## How to read Cache-Control directives

- **max-age=N** — browser caches for N seconds.
- **s-maxage=N** — CDN (Cloudflare) caches for N seconds. Overrides max-age for the CDN.
- **stale-while-revalidate=N** — when cache expires, serve stale content for N more seconds while fetching a fresh copy in the background. Users never wait.
- **must-revalidate** — when expired, must check with origin before serving (no stale).
- **public** — any cache can store this.
- **private** — only browser can cache, no CDN.

## Our strategy by file type

| File type | Cache rule | Why |
|---|---|---|
| HTML | max-age=0, must-revalidate, s-maxage=300 | Content changes often, browsers always check |
| CSS / JS | max-age=300, s-maxage=3600, stale-while-revalidate=86400 | Updates propagate in 5 min for users, 1h on CDN |
| Images | max-age=86400, s-maxage=604800 | Rarely change, OK to cache 1 day client / 1 week CDN |
| Fonts (.woff/.woff2) | max-age=31536000, immutable | Font files at same URL never change content |
| robots.txt, sitemap.xml | max-age=600 | 10 min is enough |

## How to force a cache purge

After you update a JS/CSS/HTML file and the change isn't visible after 5 minutes:

### Option A — Purge Cloudflare cache (instant)
1. Cloudflare Dashboard → click domain lotopowerball.com
2. Sidebar → Caching → Configuration
3. Purge Everything → confirm
4. Wait 30 seconds, hard reload (Ctrl+Shift+R)

### Option B — Wait for natural expiry
With the current rules, CSS/JS expires from CDN in 1 hour. Just wait.

### Option C — Add a version query
In HTML, reference the file with a version param like main.js?v=2 in the script src attribute. Bumping the number tricks all caches into treating it as a new URL.

## Deploy checklist when updating frontend

1. Edit file on GitHub (or push from local)
2. Commit + push
3. Wait 30 seconds — Cloudflare Pages auto-deploys
4. Open site, Ctrl+Shift+R
5. If not updated after 5 minutes — purge Cloudflare cache (Option A above)

## When to revisit this

- If you add a build step (e.g. Vite, esbuild) that hashes filenames, switch JS/CSS back to `immutable` with long max-age
- If you start using service workers, review caching there too
