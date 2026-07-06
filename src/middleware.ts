import { defineMiddleware } from 'astro:middleware';

const ADMIN_PASSWORD = import.meta.env.ADMIN_PASSWORD ?? 'golfclub2024';
const COOKIE_NAME = 'gc_admin_auth';
const COOKIE_VALUE = 'authenticated';

const isDev = import.meta.env.DEV;

export const onRequest = defineMiddleware(async ({ url, cookies, redirect }, next) => {
  const path = url.pathname;

  // Redirect /verwaltung → /keystatic (custom admin URL)
  if (path === '/verwaltung' || path === '/verwaltung/') {
    return redirect('/keystatic', 302);
  }

  // Passwortschutz nur auf der Live-Seite (nicht im lokalen Dev)
  if (!isDev && path.startsWith('/keystatic')) {
    if (path === '/keystatic/login') {
      return next();
    }

    const auth = cookies.get(COOKIE_NAME);
    if (auth?.value !== COOKIE_VALUE) {
      return redirect(`/keystatic/login?from=${encodeURIComponent(path)}`, 302);
    }
  }

  // iframe-Einbettung für Directus-Vorschau erlauben
  const response = await next();
  response.headers.set('X-Frame-Options', 'ALLOWALL');
  response.headers.set('Content-Security-Policy', "frame-ancestors *");
  return response;
});
