import { config, fields, collection, singleton } from '@keystatic/core';

export default config({
  storage: { kind: 'local' },
  ui: {
    brand: { name: 'Verwaltung · GC Schwäbisch Hall' },
    navigation: {
      'Inhalt': ['events', 'news'],
      'Club': ['team', 'clubmeister', 'holeinone', 'mannschaften'],
      'Anlage & Preise': ['spielgebuehren', 'spielgruppen', 'restaurant'],
      'Einstellungen': ['platzstatus', 'settings'],
    },
  },

  collections: {
    team: collection({
      label: 'Personen & Vorstand',
      slugField: 'name',
      path: 'src/content/team/*',
      format: { data: 'json' },
      schema: {
        name: fields.slug({ name: { label: 'Name' } }),
        rolle: fields.text({ label: 'Funktion / Rolle', description: 'z.B. Präsident, Trainerin, Kassierer' }),
        gruppe: fields.select({
          label: 'Gruppe',
          options: [
            { label: 'Geschäftsführender Vorstand', value: 'vorstand_gf' },
            { label: 'Vorstandsmitglieder', value: 'vorstand' },
            { label: 'Geschäftsstelle', value: 'geschaeftsstelle' },
            { label: 'Trainer & Pro', value: 'trainer' },
            { label: 'Ehrenmitglieder', value: 'ehren' },
          ],
          defaultValue: 'vorstand',
        }),
        email: fields.text({ label: 'E-Mail (optional)' }),
        telefon: fields.text({ label: 'Telefon (optional)' }),
        bild: fields.image({
          label: 'Foto',
          directory: 'public/images/team',
          publicPath: '/images/team/',
        }),
        reihenfolge: fields.integer({ label: 'Reihenfolge (1 = oben)', defaultValue: 99 }),
      },
    }),

    clubmeister: collection({
      label: 'Clubmeister',
      slugField: 'titel',
      path: 'src/content/clubmeister/*',
      format: { data: 'json' },
      schema: {
        titel: fields.slug({ name: { label: 'Jahr (z.B. 2025)', description: 'Wird als Dateiname verwendet' } }),
        herren: fields.text({ label: 'Herren Clubmeister' }),
        herren_bild: fields.image({
          label: 'Foto Herren Clubmeister (optional)',
          directory: 'public/images/clubmeister',
          publicPath: '/images/clubmeister/',
        }),
        damen: fields.text({ label: 'Damen Clubmeisterin' }),
        damen_bild: fields.image({
          label: 'Foto Damen Clubmeisterin (optional)',
          directory: 'public/images/clubmeister',
          publicPath: '/images/clubmeister/',
        }),
        senioren: fields.text({ label: 'Senioren (optional)' }),
        senioren_bild: fields.image({
          label: 'Foto Senioren (optional)',
          directory: 'public/images/clubmeister',
          publicPath: '/images/clubmeister/',
        }),
        seniorinnen: fields.text({ label: 'Seniorinnen (optional)' }),
        seniorinnen_bild: fields.image({
          label: 'Foto Seniorinnen (optional)',
          directory: 'public/images/clubmeister',
          publicPath: '/images/clubmeister/',
        }),
        jugend: fields.text({ label: 'Jugend (optional)' }),
        brutto: fields.text({ label: 'Brutto-Clubmeister (optional)' }),
      },
    }),

    events: collection({
      label: 'Veranstaltungen & Turniere',
      slugField: 'title',
      path: 'src/content/events/*',
      format: { data: 'json' },
      schema: {
        title: fields.slug({ name: { label: 'Titel' } }),
        date: fields.date({ label: 'Datum', validation: { isRequired: true } }),
        endDate: fields.date({ label: 'Enddatum (optional)' }),
        category: fields.select({
          label: 'Kategorie',
          options: [
            { label: 'Turnier', value: 'turnier' },
            { label: 'Clubveranstaltung', value: 'club' },
            { label: 'Golfschule', value: 'golfschule' },
            { label: 'Restaurant', value: 'restaurant' },
            { label: 'Sonstiges', value: 'sonstiges' },
          ],
          defaultValue: 'turnier',
        }),
        description: fields.text({ label: 'Beschreibung', multiline: true }),
        location: fields.text({ label: 'Ort (optional)' }),
        registrationLink: fields.url({ label: 'Anmeldelink (optional)' }),
        featured: fields.checkbox({ label: 'Auf Startseite hervorheben', defaultValue: false }),
      },
    }),

    news: collection({
      label: 'News & Aktuelles',
      slugField: 'title',
      path: 'src/content/news/*',
      format: { data: 'json' },
      schema: {
        title: fields.slug({ name: { label: 'Titel' } }),
        date: fields.date({ label: 'Datum', validation: { isRequired: true } }),
        excerpt: fields.text({ label: 'Kurzbeschreibung', multiline: true }),
        content: fields.mdx({ label: 'Inhalt' }),
        image: fields.image({
          label: 'Bild',
          directory: 'public/images/news',
          publicPath: '/images/news/',
        }),
        featured: fields.checkbox({ label: 'Auf Startseite hervorheben', defaultValue: false }),
      },
    }),

    holeinone: collection({
      label: 'Hole-in-One Liste',
      slugField: 'name',
      path: 'src/content/holeinone/*',
      format: { data: 'json' },
      schema: {
        name: fields.slug({ name: { label: 'Name des Spielers / der Spielerin' } }),
        datum: fields.date({ label: 'Datum', validation: { isRequired: true } }),
        bahn: fields.integer({ label: 'Bahn (Nummer)', validation: { isRequired: true } }),
      },
    }),

    mannschaften: collection({
      label: 'Mannschaften',
      slugField: 'name',
      path: 'src/content/mannschaften/*',
      format: { data: 'json' },
      schema: {
        name: fields.slug({ name: { label: 'Mannschaftsname', description: 'z.B. Herren, Damen AK 50' } }),
        ligen: fields.array(
          fields.object({
            liga: fields.text({ label: 'Liga', description: 'z.B. BWMM 4. Liga' }),
            aktiv: fields.checkbox({ label: 'Aktiv in dieser Saison', defaultValue: true }),
          }),
          { label: 'Ligen', itemLabel: (p) => p.fields.liga.value || 'Liga' }
        ),
        beschreibung: fields.text({ label: 'Beschreibung', multiline: true }),
        reihenfolge: fields.integer({ label: 'Reihenfolge', defaultValue: 99 }),
      },
    }),
  },

  singletons: {
    spielgebuehren: singleton({
      label: 'Spielgebühren',
      path: 'src/content/spielgebuehren',
      format: { data: 'json' },
      schema: {
        saison: fields.text({ label: 'Saison / Jahr', description: 'z.B. 2026' }),
        hinweis: fields.text({ label: 'Allgemeiner Hinweis (optional)', multiline: true }),

        greenfee18: fields.array(
          fields.object({
            kategorie: fields.text({ label: 'Kategorie', description: 'z.B. Mit Regionalkennung (DGV-Ausweis)' }),
            wochentag: fields.text({ label: 'Preis Wochentag', description: 'z.B. 65 €' }),
            wochenende: fields.text({ label: 'Preis Wochenende/Feiertag', description: 'z.B. 80 €' }),
          }),
          { label: '18-Loch Greenfee', itemLabel: (p) => p.fields.kategorie.value || 'Kategorie' }
        ),

        greenfee9: fields.array(
          fields.object({
            kategorie: fields.text({ label: 'Kategorie' }),
            wochentag: fields.text({ label: 'Preis Wochentag' }),
            wochenende: fields.text({ label: 'Preis Wochenende/Feiertag' }),
          }),
          { label: '9-Loch Greenfee', itemLabel: (p) => p.fields.kategorie.value || 'Kategorie' }
        ),

        kurzplatz: fields.array(
          fields.object({
            kategorie: fields.text({ label: 'Kategorie' }),
            wochentag: fields.text({ label: 'Preis Wochentag' }),
            wochenende: fields.text({ label: 'Preis Wochenende/Feiertag' }),
          }),
          { label: '6-Loch Kurzplatz Greenfee', itemLabel: (p) => p.fields.kategorie.value || 'Kategorie' }
        ),

        leihgebuehren: fields.array(
          fields.object({
            item: fields.text({ label: 'Artikel', description: 'z.B. E-Cart (18 Loch)' }),
            preis: fields.text({ label: 'Preis', description: 'z.B. 40 €' }),
          }),
          { label: 'Leihgebühren', itemLabel: (p) => p.fields.item.value || 'Artikel' }
        ),
      },
    }),

    spielgruppen: singleton({
      label: 'Spielgruppen',
      path: 'src/content/spielgruppen',
      format: { data: 'json' },
      schema: {
        gruppen: fields.array(
          fields.object({
            name: fields.text({ label: 'Gruppenname', description: 'z.B. Ladies Golf' }),
            beschreibung: fields.text({ label: 'Beschreibung', multiline: true }),
            termine: fields.array(
              fields.object({
                saison: fields.text({ label: 'Saison', description: 'z.B. Juni, Juli & August' }),
                uhrzeit: fields.text({ label: 'Spieltermin', description: 'z.B. Dienstag ab 10:00 Uhr' }),
              }),
              { label: 'Spieltermine', itemLabel: (p) => p.fields.uhrzeit.value || 'Termin' }
            ),
            ansprechpartner_titel: fields.text({ label: 'Titel Ansprechpartner', description: 'z.B. Ansprechpartnerin' }),
            ansprechpartner_name: fields.text({ label: 'Name Ansprechpartner' }),
            telefon: fields.text({ label: 'Telefon' }),
            email: fields.text({ label: 'E-Mail' }),
          }),
          { label: 'Spielgruppen', itemLabel: (p) => p.fields.name.value || 'Gruppe' }
        ),
      },
    }),

    restaurant: singleton({
      label: 'Restaurant Brassie',
      path: 'src/content/restaurant',
      format: { data: 'json' },
      schema: {
        oeffnungszeiten: fields.array(
          fields.object({
            tag: fields.text({ label: 'Tag / Zeitraum', description: 'z.B. Dienstag – Sonntag' }),
            zeit: fields.text({ label: 'Uhrzeit', description: 'z.B. ab 11:00 Uhr oder Ruhetag' }),
            ruhetag: fields.checkbox({ label: 'Ruhetag', defaultValue: false }),
          }),
          { label: 'Öffnungszeiten', itemLabel: (p) => `${p.fields.tag.value}: ${p.fields.zeit.value}` }
        ),
        hinweis: fields.text({ label: 'Saisonaler Hinweis (optional)', multiline: true, description: 'z.B. Abweichende Öffnungszeiten im Winter' }),
        reservierungTelefon: fields.text({ label: 'Telefon Reservierung' }),
        reservierungEmail: fields.text({ label: 'E-Mail Reservierung' }),
        reservierungUrl: fields.url({ label: 'Online-Reservierung URL (optional)' }),
      },
    }),


    platzstatus: singleton({
      label: 'Platzstatus',
      path: 'src/content/platzstatus',
      format: { data: 'json' },
      schema: {
        // ── Aktueller Status (manuell) ──────────────────────────────────
        hauptplatz: fields.select({
          label: '⛳ Hauptplatz (18 Loch)',
          description: 'Manuelle Einstellung überschreibt Zeitsteuerung und Sperrzeiten.',
          options: [
            { label: '✅ Geöffnet', value: 'open' },
            { label: '⚠️ Eingeschränkt', value: 'limited' },
            { label: '🚫 Geschlossen', value: 'closed' },
            { label: '🕐 Automatisch (Zeitsteuerung + Sperrzeiten)', value: 'auto' },
          ],
          defaultValue: 'auto',
        }),
        kurzplatz: fields.select({
          label: '🏌️ Kurzplatz (6 Loch)',
          options: [
            { label: '✅ Geöffnet', value: 'open' },
            { label: '⚠️ Eingeschränkt', value: 'limited' },
            { label: '🚫 Geschlossen', value: 'closed' },
            { label: '🕐 Automatisch', value: 'auto' },
          ],
          defaultValue: 'auto',
        }),
        drivingRange: fields.select({
          label: '🏹 Driving Range',
          options: [
            { label: '✅ Geöffnet', value: 'open' },
            { label: '⚠️ Eingeschränkt', value: 'limited' },
            { label: '🚫 Geschlossen', value: 'closed' },
            { label: '🕐 Automatisch', value: 'auto' },
          ],
          defaultValue: 'auto',
        }),
        cafe: fields.select({
          label: '☕ Restaurant / Café',
          options: [
            { label: '✅ Geöffnet', value: 'open' },
            { label: '⚠️ Eingeschränkt', value: 'limited' },
            { label: '🚫 Geschlossen', value: 'closed' },
            { label: '🕐 Automatisch', value: 'auto' },
          ],
          defaultValue: 'auto',
        }),
        carts: fields.select({
          label: '🚗 Carts / Elektrobuggys',
          options: [
            { label: '✅ Erlaubt', value: 'open' },
            { label: '⚠️ Eingeschränkt', value: 'limited' },
            { label: '🚫 Nicht erlaubt', value: 'closed' },
          ],
          defaultValue: 'open',
        }),
        hinweis: fields.text({ label: '📢 Aktueller Hinweis (optional)', multiline: true }),

        // ── Geplante Sperrzeiten ────────────────────────────────────────
        sperrzeiten: fields.array(
          fields.object({
            vonDatum: fields.date({ label: 'Von (Datum)', validation: { isRequired: true } }),
            bisDatum: fields.date({ label: 'Bis (Datum)', validation: { isRequired: true } }),
            grund: fields.text({ label: 'Grund / Beschreibung', description: 'z.B. Aerifizierung, Turnier, Winterpause' }),
            hauptplatz: fields.select({
              label: 'Hauptplatz Status',
              options: [
                { label: 'Unverändert', value: 'auto' },
                { label: '🚫 Geschlossen', value: 'closed' },
                { label: '⚠️ Eingeschränkt', value: 'limited' },
                { label: '✅ Geöffnet', value: 'open' },
              ],
              defaultValue: 'closed',
            }),
            kurzplatz: fields.select({
              label: 'Kurzplatz Status',
              options: [
                { label: 'Unverändert', value: 'auto' },
                { label: '🚫 Geschlossen', value: 'closed' },
                { label: '⚠️ Eingeschränkt', value: 'limited' },
                { label: '✅ Geöffnet', value: 'open' },
              ],
              defaultValue: 'auto',
            }),
            drivingRange: fields.select({
              label: 'Driving Range Status',
              options: [
                { label: 'Unverändert', value: 'auto' },
                { label: '🚫 Geschlossen', value: 'closed' },
                { label: '⚠️ Eingeschränkt', value: 'limited' },
                { label: '✅ Geöffnet', value: 'open' },
              ],
              defaultValue: 'auto',
            }),
            carts: fields.select({
              label: 'Carts Status',
              options: [
                { label: 'Unverändert', value: 'auto' },
                { label: '🚫 Nicht erlaubt', value: 'closed' },
                { label: '⚠️ Eingeschränkt', value: 'limited' },
                { label: '✅ Erlaubt', value: 'open' },
              ],
              defaultValue: 'closed',
            }),
          }),
          {
            label: '📅 Geplante Sperrzeiten / Vorankündigungen',
            description: 'Zeiträume in denen Platz oder Anlagen geschlossen/eingeschränkt sind. Wird automatisch aktiviert wenn das Datum erreicht wird.',
            itemLabel: (props) => {
              const von = props.fields.vonDatum.value ?? '?';
              const bis = props.fields.bisDatum.value ?? '?';
              const grund = props.fields.grund.value || 'Sperrzeit';
              return `${grund} (${von} – ${bis})`;
            },
          }
        ),

        // ── Reguläre Öffnungszeiten (Zeitsteuerung) ─────────────────────
        zeitsteuerung: fields.object(
          {
            hauptplatzOeffnet: fields.text({ label: 'Hauptplatz öffnet um (HH:MM)', description: 'z.B. 07:00' }),
            hauptplatzSchliesst: fields.text({ label: 'Hauptplatz schließt um (HH:MM)', description: 'z.B. 20:00' }),
            kurzplatzOeffnet: fields.text({ label: 'Kurzplatz öffnet um (HH:MM)' }),
            kurzplatzSchliesst: fields.text({ label: 'Kurzplatz schließt um (HH:MM)' }),
            drivingRangeOeffnet: fields.text({ label: 'Driving Range öffnet um (HH:MM)' }),
            drivingRangeSchliesst: fields.text({ label: 'Driving Range schließt um (HH:MM)' }),
            cafeOeffnet: fields.text({ label: 'Restaurant öffnet um (HH:MM)' }),
            cafeSchliesst: fields.text({ label: 'Restaurant schließt um (HH:MM)' }),
          },
          { label: '🕐 Reguläre Öffnungszeiten (für Automatik-Modus)' }
        ),
      },
    }),

    settings: singleton({
      label: 'Einstellungen',
      path: 'src/content/settings',
      format: { data: 'json' },
      schema: {
        greenfeeUrl: fields.url({ label: 'Greenfee Buchungs-URL', validation: { isRequired: true } }),
        turniersoftwareUrl: fields.url({ label: 'Turniersoftware URL (optional)' }),
        restaurantReservierungUrl: fields.url({ label: 'Restaurant Reservierung URL (optional)' }),
        telefon: fields.text({ label: 'Telefon Sekretariat' }),
        telefonRestaurant: fields.text({ label: 'Telefon Restaurant' }),
        email: fields.text({ label: 'E-Mail' }),
      },
    }),
  },
});
