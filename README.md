# V-Kit

83 drop-in Vue 3 components. No package to install, no build config to fight,
no framework lock-in — copy one `.vue` file into your project and it just works.

**Live site:** _(add your domain here once it's live)_

## What's in here

- `index.html` — the landing page (single self-contained file, no build step)
- `vkit-free.zip` — 23 free components (buttons, forms, cards, nav, etc.)

The paid **Pro pack** (63 components — full date/time suite, color pickers,
data tables, command palette, dialogs, and more) is sold separately via the
Buy button on the landing page.

## Local development

This folder is just static files — open `index.html` directly in a browser,
or serve it locally:

```bash
npx serve .
```

## Deploying

Push to `main` and connect this repo to Vercel (or Netlify) — both auto-detect
a static site and deploy on every push, free tier is enough for this.

## Source

The components themselves are built and maintained in the main V-Kit project
(Vue 3 + Vite, 4 themes: light/dark/ocean/sunset). This repo is the packaged,
sellable output — not the component source.
