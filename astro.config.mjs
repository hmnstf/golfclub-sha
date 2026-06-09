// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';
import cookieconsent from '@jop-software/astro-cookieconsent';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    cookieconsent({
      guiOptions: {
        consentModal: {
          layout: 'box',
          position: 'bottom left',
          equalWeightButtons: false,
          flipButtons: false,
        },
        preferencesModal: {
          layout: 'box',
          position: 'right',
          equalWeightButtons: true,
          flipButtons: false,
        },
      },
      categories: {
        necessary: {
          enabled: true,
          readOnly: true,
        },
        analytics: {
          enabled: false,
        },
        maps: {
          enabled: false,
        },
      },
      language: {
        default: 'de',
        translations: {
          de: {
            consentModal: {
              title: 'Wir verwenden Cookies',
              description:
                'Diese Website verwendet Cookies, um Ihnen die bestmögliche Nutzererfahrung zu bieten. Einige Cookies sind technisch notwendig, andere helfen uns, die Website zu verbessern. Sie können Ihre Auswahl jederzeit in den Einstellungen ändern.',
              acceptAllBtn: 'Alle akzeptieren',
              acceptNecessaryBtn: 'Nur notwendige',
              showPreferencesBtn: 'Einstellungen',
              footer: '<a href="/impressum">Impressum</a> · <a href="/datenschutz">Datenschutz</a>',
            },
            preferencesModal: {
              title: 'Cookie-Einstellungen',
              acceptAllBtn: 'Alle akzeptieren',
              acceptNecessaryBtn: 'Nur notwendige',
              savePreferencesBtn: 'Einstellungen speichern',
              closeIconLabel: 'Schließen',
              serviceCounterLabel: 'Dienste',
              sections: [
                {
                  title: 'Notwendige Cookies',
                  description:
                    'Diese Cookies sind für den Betrieb der Website erforderlich und können nicht deaktiviert werden.',
                  linkedCategory: 'necessary',
                },
                {
                  title: 'Google Maps',
                  description:
                    'Wir binden Google Maps auf der Kontaktseite ein, um Ihnen die Anfahrt zu erleichtern. Dazu werden Daten an Google übertragen.',
                  linkedCategory: 'maps',
                  cookieTable: {
                    headers: { name: 'Cookie', domain: 'Domain', desc: 'Beschreibung' },
                    body: [
                      { name: 'NID, CONSENT', domain: 'google.com', desc: 'Google Maps Funktionalität' },
                    ],
                  },
                },
                {
                  title: 'Mehr Informationen',
                  description:
                    'Bei Fragen zu unserer Cookie-Richtlinie wenden Sie sich bitte an <a href="/kontakt">unsere Geschäftsstelle</a>.',
                },
              ],
            },
          },
        },
      },
    }),
  ],
  security: {
    checkOrigin: false,
  },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['vanilla-cookieconsent'],
    },
    server: {
      allowedHosts: true,
    },
  }
});
