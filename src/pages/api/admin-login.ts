export const prerender = false;

import type { APIRoute } from 'astro';

const ADMIN_PASSWORD = import.meta.env.ADMIN_PASSWORD ?? 'golfclub2024';
const COOKIE_NAME = 'gc_admin_auth';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const password = form.get('password')?.toString() ?? '';
  const from = form.get('from')?.toString() ?? '/keystatic';

  if (password !== ADMIN_PASSWORD) {
    return redirect(`/keystatic/login?error=1&from=${encodeURIComponent(from)}`, 302);
  }

  cookies.set(COOKIE_NAME, 'authenticated', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 Stunden
  });

  return redirect(from, 302);
};

export const GET: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete('gc_admin_auth', { path: '/' });
  return redirect('/', 302);
};
