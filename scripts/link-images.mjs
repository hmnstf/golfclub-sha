const BASE_URL = 'http://localhost:8055';
const { data: { access_token: TOKEN } } = await fetch(`${BASE_URL}/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@gc-sha.de', password: 'golfclub2024' }),
}).then(r => r.json());

const api = async (url, opts={}) => {
  const r = await fetch(BASE_URL+url, {
    ...opts,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...opts.headers },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await r.text();
  if (!text) return {};
  return JSON.parse(text);
};

const log = (e, m) => console.log(`${e}  ${m}`);

// Alle hochgeladenen Dateien laden (mit Dateiname)
const allFiles = await api('/files?limit=200&fields=id,filename_download,title');
const fileByName = {};
for (const f of allFiles.data ?? []) {
  // z.B. "alexander-wolf.jpg"
  fileByName[f.filename_download] = f.id;
  const baseName = f.filename_download?.replace(/\.[^.]+$/, '');
  if (baseName) fileByName[baseName] = f.id;
}

log('📁', `${Object.keys(fileByName).length / 2} Dateien in Directus gefunden`);

// ── Team ──────────────────────────────────────────────────────────────────────
// Namen-zu-Dateiname Mapping (name → slug)
const slugify = (name) => name.toLowerCase()
  .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const teamItems = await api('/items/team?limit=100&fields=id,name');
log('👤', `${teamItems.data?.length} Team-Mitglieder verknüpfen...`);
for (const item of teamItems.data ?? []) {
  const slug = slugify(item.name);
  const fileId = fileByName[`${slug}.jpg`] ?? fileByName[slug];
  if (fileId) {
    await api(`/items/team/${item.id}`, {
      method: 'PATCH',
      body: { bild: fileId },
    });
    log('  ✓', `${item.name} → ${slug}.jpg`);
  } else {
    log('  ⚠', `${item.name} (${slug}.jpg) — kein Bild gefunden`);
  }
}

// ── Clubmeister 2025 ──────────────────────────────────────────────────────────
const cmItems = await api('/items/clubmeister?limit=100&fields=id,jahr');
log('🏆', `Clubmeister-Bilder verknüpfen...`);
for (const item of cmItems.data ?? []) {
  const updates = {};
  for (const [field, filename] of [
    ['herren_bild', `${item.jahr}-herren.jpg`],
    ['damen_bild', `${item.jahr}-damen.jpg`],
    ['senioren_bild', `${item.jahr}-senioren.jpg`],
    ['seniorinnen_bild', `${item.jahr}-seniorinnen.jpg`],
  ]) {
    const fileId = fileByName[filename];
    if (fileId) updates[field] = fileId;
  }
  if (Object.keys(updates).length > 0) {
    await api(`/items/clubmeister/${item.id}`, { method: 'PATCH', body: updates });
    log('  ✓', `Clubmeister ${item.jahr}: ${Object.keys(updates).join(', ')}`);
  }
}

log('🎉', 'Fertig! Alle Bilder verknüpft.');
