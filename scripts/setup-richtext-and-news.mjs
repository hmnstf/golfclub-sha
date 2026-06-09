const BASE_URL = 'http://localhost:8055';
const { data: { access_token: TOKEN } } = await fetch(`${BASE_URL}/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@gc-sha.de', password: 'golfclub2024' }),
}).then(r => r.json());

const api = async (url, opts = {}) => {
  const r = await fetch(`${BASE_URL}${url}`, {
    ...opts,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...opts.headers },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await r.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { _raw: text }; }
};

const log = (e, m) => console.log(`${e}  ${m}`);
const err = (m, r) => console.error(`❌  ${m}:`, JSON.stringify(r?.errors ?? r).slice(0, 200));

// ── 1. mannschaften.beschreibung → Flexible Editor ───────────────────────────
log('✏️', 'mannschaften.beschreibung → Flexible Editor...');
let r = await api('/fields/mannschaften/beschreibung', { method: 'PATCH', body: {
  meta: {
    interface: 'extension-flexible-editor',
    options: {
      tools: ['heading', 'bold', 'italic', 'underline', 'bulletList', 'orderedList', 'link', 'hardBreak'],
    },
    note: 'Beschreibung der Mannschaft',
  },
}});
r.errors ? err('mannschaften.beschreibung', r) : log('✅', 'mannschaften.beschreibung umgestellt');

// ── 2. events.beschreibung → Flexible Editor ─────────────────────────────────
log('✏️', 'events.beschreibung → Flexible Editor...');
r = await api('/fields/events/beschreibung', { method: 'PATCH', body: {
  meta: {
    interface: 'extension-flexible-editor',
    options: {
      tools: ['heading', 'bold', 'italic', 'underline', 'bulletList', 'orderedList', 'link', 'image', 'hardBreak'],
    },
    note: 'Ausführliche Turnierbeschreibung',
  },
}});
r.errors ? err('events.beschreibung', r) : log('✅', 'events.beschreibung umgestellt');

// ── 3. News Collection anlegen ────────────────────────────────────────────────
log('📰', 'News Collection anlegen...');

r = await api('/collections', { method: 'POST', body: {
  collection: 'news',
  meta: {
    icon: 'newspaper',
    display_template: '{{titel}}',
    sort_field: 'datum',
    archive_field: 'status',
    archive_value: 'archiviert',
    unarchive_value: 'entwurf',
    translations: [{ language: 'de-DE', translation: 'News' }],
  },
  schema: {},
}});
r.errors ? err('news collection', r) : log('✅', 'news Collection angelegt');

// ── 4. News Felder anlegen ────────────────────────────────────────────────────
log('🔧', 'News Felder anlegen...');

const newsFields = [
  // Status (Entwurf / Veröffentlicht / Archiviert)
  {
    field: 'status',
    type: 'string',
    meta: {
      interface: 'select-dropdown',
      display: 'labels',
      display_options: {
        choices: [
          { text: 'Entwurf', value: 'entwurf', foreground: '#ffffff', background: '#a2b5cd' },
          { text: 'Veröffentlicht', value: 'veroeffentlicht', foreground: '#ffffff', background: '#2d9a54' },
          { text: 'Archiviert', value: 'archiviert', foreground: '#ffffff', background: '#888888' },
        ],
      },
      options: {
        choices: [
          { text: 'Entwurf', value: 'entwurf' },
          { text: 'Veröffentlicht', value: 'veroeffentlicht' },
          { text: 'Archiviert', value: 'archiviert' },
        ],
      },
      required: true,
      width: 'half',
    },
    schema: { default_value: 'entwurf', is_nullable: false },
  },
  // Datum
  {
    field: 'datum',
    type: 'date',
    meta: {
      interface: 'datetime',
      display: 'datetime',
      display_options: { format: 'DD.MM.YYYY' },
      required: true,
      width: 'half',
      note: 'Veröffentlichungsdatum',
    },
  },
  // Titel
  {
    field: 'titel',
    type: 'string',
    meta: {
      interface: 'input',
      display: 'raw',
      required: true,
      width: 'full',
      note: 'Titel des Beitrags',
      options: { placeholder: 'z.B. Clubmeisterschaft 2025 – Ergebnisse' },
    },
    schema: { is_nullable: false },
  },
  // Slug (URL)
  {
    field: 'slug',
    type: 'string',
    meta: {
      interface: 'input',
      display: 'raw',
      width: 'full',
      note: 'URL-Pfad (wird automatisch aus Titel generiert) – z.B. clubmeisterschaft-2025',
      options: { slug: true, placeholder: 'clubmeisterschaft-2025' },
    },
  },
  // Kurzbeschreibung (Teaser)
  {
    field: 'zusammenfassung',
    type: 'text',
    meta: {
      interface: 'input-multiline',
      display: 'raw',
      width: 'full',
      note: 'Kurze Zusammenfassung für Übersichtsseite und Social Media (max. 200 Zeichen)',
      options: { placeholder: 'Kurze Zusammenfassung...' },
    },
  },
  // Titelbild
  {
    field: 'bild',
    type: 'uuid',
    meta: {
      interface: 'file-image',
      display: 'image',
      width: 'full',
      note: 'Titelbild (wird in der Übersicht und ganz oben im Beitrag angezeigt)',
    },
    schema: { is_nullable: true },
  },
  // Hauptinhalt (Rich Text)
  {
    field: 'inhalt',
    type: 'text',
    meta: {
      interface: 'extension-flexible-editor',
      display: 'raw',
      width: 'full',
      note: 'Hauptinhalt des Beitrags',
      options: {
        tools: [
          'heading', 'bold', 'italic', 'underline', 'strike',
          'bulletList', 'orderedList', 'blockquote',
          'link', 'image', 'hardBreak', 'horizontalRule',
        ],
      },
    },
  },
  // Kategorie
  {
    field: 'kategorie',
    type: 'string',
    meta: {
      interface: 'select-dropdown',
      display: 'labels',
      width: 'half',
      options: {
        choices: [
          { text: '⛳ Turnier', value: 'turnier' },
          { text: '🏆 Ergebnis', value: 'ergebnis' },
          { text: '📣 Ankündigung', value: 'ankuendigung' },
          { text: '🌿 Platz & Anlage', value: 'platz' },
          { text: '👥 Club', value: 'club' },
          { text: '📰 Allgemein', value: 'allgemein' },
        ],
      },
    },
    schema: { default_value: 'allgemein', is_nullable: true },
  },
  // Highlight (auf Startseite featured)
  {
    field: 'highlight',
    type: 'boolean',
    meta: {
      interface: 'boolean',
      display: 'boolean',
      width: 'half',
      note: 'Auf Startseite hervorheben?',
    },
    schema: { default_value: false },
  },
];

for (const field of newsFields) {
  const res = await api('/fields/news', { method: 'POST', body: field });
  res.errors ? err(`news.${field.field}`, res) : log('  ✓', `news.${field.field}`);
}

// File-Relation für news.bild
r = await api('/relations', { method: 'POST', body: {
  collection: 'news',
  field: 'bild',
  related_collection: 'directus_files',
}});
r.errors ? err('news.bild relation', r) : log('✅', 'news.bild → directus_files verknüpft');

// ── 5. SEO Felder zu News hinzufügen ─────────────────────────────────────────
log('🔍', 'SEO Felder für News anlegen...');

const seoFields = [
  {
    field: 'seo_titel',
    type: 'string',
    meta: {
      interface: 'input',
      width: 'full',
      note: 'SEO-Titel (falls leer: normaler Titel wird verwendet) – max. 60 Zeichen',
      options: { placeholder: 'z.B. Clubmeisterschaft 2025 | GC Schwäbisch Hall' },
      group: 'seo_gruppe',
    },
  },
  {
    field: 'seo_beschreibung',
    type: 'text',
    meta: {
      interface: 'input-multiline',
      width: 'full',
      note: 'Meta-Description für Google – max. 160 Zeichen',
      options: { placeholder: 'Kurze Beschreibung für Suchmaschinen...' },
      group: 'seo_gruppe',
    },
  },
];

// SEO Gruppe (Divider)
r = await api('/fields/news', { method: 'POST', body: {
  field: 'seo_gruppe',
  type: 'alias',
  meta: {
    interface: 'group-detail',
    special: ['group'],
    width: 'full',
    options: { start: 'closed' },
    note: 'Suchmaschinenoptimierung',
    display: null,
  },
}});
r.errors ? err('seo_gruppe', r) : log('  ✓', 'SEO Gruppe');

for (const field of seoFields) {
  const res = await api('/fields/news', { method: 'POST', body: field });
  res.errors ? err(`news.${field.field}`, res) : log('  ✓', `news.${field.field}`);
}

// ── 6. Beispiel-News erstellen ────────────────────────────────────────────────
log('📝', 'Beispiel-News erstellen...');

r = await api('/items/news', { method: 'POST', body: {
  status: 'veroeffentlicht',
  datum: '2025-05-20',
  titel: 'Clubmeisterschaft 2025 – Die Sieger stehen fest',
  slug: 'clubmeisterschaft-2025-sieger',
  zusammenfassung: 'Bei strahlendem Sonnenschein kämpften unsere Mitglieder um den begehrten Titel des Clubmeisters 2025. Nach spannenden Runden stehen die diesjährigen Sieger fest.',
  inhalt: '<h2>Ein unvergesslicher Tag auf der Anlage</h2><p>Mit über 80 Teilnehmerinnen und Teilnehmern war die Clubmeisterschaft 2025 ein voller Erfolg. Bei perfektem Golfwetter zeigten unsere Mitglieder ihr Können.</p><h2>Die Sieger</h2><ul><li><strong>Herren:</strong> Mustermann, Hans (HCP 4,2)</li><li><strong>Damen:</strong> Musterfrau, Maria (HCP 8,1)</li><li><strong>Senioren:</strong> Mustermann, Karl (HCP 12,0)</li></ul><p>Herzlichen Glückwunsch an alle Siegerinnen und Sieger!</p>',
  kategorie: 'ergebnis',
  highlight: true,
}});
r.errors ? err('Beispiel-News', r) : log('✅', `Beispiel-News erstellt (ID: ${r.data?.id})`);

// ── 7. Dashboard Panels für Insights einrichten ───────────────────────────────
log('📊', 'Dashboard-Panels einrichten...');

// Erst prüfen ob schon ein Dashboard existiert
const dashboards = await api('/dashboards');
let dashboardId = dashboards.data?.[0]?.id;

if (!dashboardId) {
  const db = await api('/dashboards', { method: 'POST', body: {
    name: 'GC SHA Übersicht',
    icon: 'golf_course',
    color: '#132e21',
  }});
  dashboardId = db.data?.id;
  log('  ✓', `Dashboard erstellt (${dashboardId})`);
} else {
  log('  ℹ', `Bestehendes Dashboard gefunden (${dashboardId})`);
}

if (dashboardId) {
  const panels = [
    // Anstehende Events
    {
      dashboard: dashboardId,
      name: 'Anstehende Events',
      icon: 'event',
      color: '#c4a94a',
      type: 'list',
      options: {
        collection: 'events',
        limit: 5,
        displayTemplate: '{{titel}} – {{datum_von}}',
        filter: {},
      },
      position_x: 1, position_y: 1,
      width: 24, height: 8,
    },
    // News Übersicht
    {
      dashboard: dashboardId,
      name: 'Neueste News',
      icon: 'newspaper',
      color: '#132e21',
      type: 'list',
      options: {
        collection: 'news',
        limit: 5,
        displayTemplate: '{{titel}}',
        filter: { status: { _eq: 'veroeffentlicht' } },
      },
      position_x: 25, position_y: 1,
      width: 24, height: 8,
    },
    // Platzstatus Hinweis
    {
      dashboard: dashboardId,
      name: 'Platzstatus',
      icon: 'sports_golf',
      color: '#2d9a54',
      type: 'metric',
      options: {
        collection: 'platzstatus',
        field: 'hinweis',
        function: 'first',
      },
      position_x: 1, position_y: 9,
      width: 20, height: 5,
    },
  ];

  for (const panel of panels) {
    const pr = await api('/panels', { method: 'POST', body: panel });
    pr.errors ? err(`Panel ${panel.name}`, pr) : log('  ✓', `Panel: ${panel.name}`);
  }
}

log('🎉', 'Alles fertig!');
log('📰', 'News: http://localhost:8055/admin/content/news');
log('📊', 'Dashboard: http://localhost:8055/admin/dashboards');
