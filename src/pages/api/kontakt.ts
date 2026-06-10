export const prerender = false;

import type { APIRoute } from 'astro';
import { getSettings } from '../../lib/directus';

async function verifyRecaptcha(token: string, secretKey: string): Promise<boolean> {
  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: secretKey, response: token }),
    }).then(r => r.json());
    // Score >= 0.5 = wahrscheinlich Mensch (0 = Bot, 1 = Mensch)
    return res.success === true && (res.score ?? 1) >= 0.5;
  } catch {
    return false;
  }
}

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();
  const name      = String(formData.get('name')     ?? '').trim();
  const email     = String(formData.get('email')    ?? '').trim();
  const telefon   = String(formData.get('telefon')  ?? '').trim();
  const betreff   = String(formData.get('betreff')  ?? '').trim();
  const nachricht = String(formData.get('nachricht') ?? '').trim();
  const token     = String(formData.get('recaptcha_token') ?? '');

  // Pflichtfelder
  if (!name || !email || !nachricht) {
    return redirect('/kontakt?error=missing', 302);
  }

  // reCAPTCHA prüfen wenn ein Secret Key hinterlegt ist
  const settings = await getSettings();
  const secretKey = settings?.recaptcha_secret_key ?? '';
  if (secretKey && token) {
    const valid = await verifyRecaptcha(token, secretKey);
    if (!valid) {
      return redirect('/kontakt?error=spam', 302);
    }
  }

  // TODO: E-Mail-Versand einrichten (z.B. Resend, Nodemailer, SMTP)
  console.log('📬 Kontaktanfrage:', { name, email, telefon, betreff, nachricht });

  return redirect('/kontakt?success=1', 302);
};
