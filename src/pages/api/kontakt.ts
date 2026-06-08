export const prerender = false;

import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();
  const vorname = formData.get('vorname');
  const nachname = formData.get('nachname');
  const email = formData.get('email');
  const nachricht = formData.get('nachricht');
  const interesse = formData.get('interesse');

  // TODO: E-Mail-Versand einrichten (z.B. mit Resend, Nodemailer oder SMTP)
  // Beispiel-Log (in Produktion durch echten Versand ersetzen):
  console.log('Kontaktanfrage:', { vorname, nachname, email, interesse, nachricht });

  return redirect('/kontakt?success=1', 302);
};
