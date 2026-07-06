export const prerender = false;

import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';
import { getSettings } from '../../lib/directus';

const RECAPTCHA_SECRET_KEY = import.meta.env.RECAPTCHA_SECRET_KEY ?? '';

const SMTP_HOST     = import.meta.env.SMTP_HOST ?? '';
const SMTP_PORT      = Number(import.meta.env.SMTP_PORT ?? 587);
const SMTP_SECURE    = import.meta.env.SMTP_SECURE === 'true';
const SMTP_USER      = import.meta.env.SMTP_USER ?? '';
const SMTP_PASSWORD  = import.meta.env.SMTP_PASSWORD ?? '';
const SMTP_FROM      = import.meta.env.SMTP_FROM ?? SMTP_USER;
const CONTACT_EMAIL_TO = import.meta.env.CONTACT_EMAIL_TO ?? '';

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

async function sendKontaktMail(opts: {
  to: string; name: string; email: string; telefon: string; betreff: string; nachricht: string;
}): Promise<boolean> {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    console.error('SMTP nicht konfiguriert (SMTP_HOST/SMTP_USER/SMTP_PASSWORD fehlen) – Mail nicht versendet');
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to: opts.to,
      replyTo: opts.email,
      subject: `Kontaktanfrage: ${opts.betreff || 'Ohne Betreff'}`,
      text: [
        `Name: ${opts.name}`,
        `E-Mail: ${opts.email}`,
        opts.telefon ? `Telefon: ${opts.telefon}` : null,
        opts.betreff ? `Betreff: ${opts.betreff}` : null,
        '',
        opts.nachricht,
      ].filter(Boolean).join('\n'),
    });
    return true;
  } catch (err) {
    console.error('Mailversand fehlgeschlagen:', err);
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
  if (RECAPTCHA_SECRET_KEY && token) {
    const valid = await verifyRecaptcha(token, RECAPTCHA_SECRET_KEY);
    if (!valid) {
      return redirect('/kontakt?error=spam', 302);
    }
  }

  const settings = await getSettings();
  const to = CONTACT_EMAIL_TO || settings?.email || '';

  if (!to) {
    console.error('Keine Empfänger-Adresse konfiguriert (CONTACT_EMAIL_TO oder settings.email)');
    return redirect('/kontakt?error=config', 302);
  }

  const sent = await sendKontaktMail({ to, name, email, telefon, betreff, nachricht });
  if (!sent) {
    return redirect('/kontakt?error=mail', 302);
  }

  return redirect('/kontakt?success=1', 302);
};
