import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (_context, next) => {
  // iframe-Einbettung für Directus-Vorschau erlauben
  const response = await next();
  response.headers.set('X-Frame-Options', 'ALLOWALL');
  response.headers.set('Content-Security-Policy', "frame-ancestors *");
  return response;
});
