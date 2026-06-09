import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:8055';
const PUBLIC_DIR = path.join(process.cwd(), 'public');

// ── Auth ──────────────────────────────────────────────────────────────────────
const { data: { access_token: TOKEN } } = await fetch(`${BASE_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@gc-sha.de', password: 'golfclub2024' }),
}).then(r => r.json());

const api = (url, opts = {}) => fetch(`${BASE_URL}${url}`, {
  ...opts,
  headers: { Authorization: `Bearer ${TOKEN}`, ...opts.headers },
}).then(r => r.json());

const log = (emoji, msg) => console.log(`${emoji}  ${msg}`);

// ── Bild hochladen ────────────────────────────────────────────────────────────
async function uploadFile(filePath, folder = null) {
  const filename = path.basename(filePath);
  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filename).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

  const form = new FormData();
  form.append('file', new Blob([fileBuffer], { type: mimeType }), filename);
  if (folder) form.append('folder', folder);

  const result = await fetch(`${BASE_URL}/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: form,
  }).then(r => r.json());

  return result.data?.id ?? null;
}

// ── Ordner anlegen ────────────────────────────────────────────────────────────
async function createFolder(name, parent = null) {
  const existing = await api(`/folders?filter[name][_eq]=${encodeURIComponent(name)}`);
  if (existing.data?.length > 0) return existing.data[0].id;

  const result = await api('/folders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parent }),
  });
  return result.data?.id;
}

// ── Ordnerstruktur anlegen ────────────────────────────────────────────────────
log('📁', 'Ordner anlegen...');
const folderTeam = await createFolder('Team');
const folderClubmeister = await createFolder('Clubmeister');
const folderGallery = await createFolder('Galerie');
const folderPlatz = await createFolder('Anlage');
const folderHero = await createFolder('Hero');
log('✅', 'Ordner angelegt');

// ── Team-Bilder hochladen ─────────────────────────────────────────────────────
log('👤', 'Team-Bilder hochladen...');
const teamImgMap = {}; // z.B. "alexander-wolf.jpg" → "uuid..."

const teamImgDir = path.join(PUBLIC_DIR, 'images/team');
if (fs.existsSync(teamImgDir)) {
  const files = fs.readdirSync(teamImgDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
  for (const file of files) {
    const id = await uploadFile(path.join(teamImgDir, file), folderTeam);
    if (id) {
      teamImgMap[file] = id;
      log('  ↑', `${file} → ${id}`);
    }
  }
}

// ── Clubmeister-Bilder hochladen ──────────────────────────────────────────────
log('🏆', 'Clubmeister-Bilder hochladen...');
const cmImgMap = {};

const cmImgDir = path.join(PUBLIC_DIR, 'images/clubmeister');
if (fs.existsSync(cmImgDir)) {
  const files = fs.readdirSync(cmImgDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
  for (const file of files) {
    const id = await uploadFile(path.join(cmImgDir, file), folderClubmeister);
    if (id) {
      cmImgMap[file] = id;
      log('  ↑', `${file} → ${id}`);
    }
  }
}

// ── Galerie-Bilder hochladen ──────────────────────────────────────────────────
log('🖼️', 'Galerie-Bilder hochladen...');
const galleryImgDir = path.join(PUBLIC_DIR, 'images/gallery');
if (fs.existsSync(galleryImgDir)) {
  const files = fs.readdirSync(galleryImgDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
  for (const file of files) {
    await uploadFile(path.join(galleryImgDir, file), folderGallery);
    log('  ↑', file);
  }
}

// ── Platz-Bilder hochladen ────────────────────────────────────────────────────
log('⛳', 'Platz-Bilder hochladen...');
const platzImgDir = path.join(PUBLIC_DIR, 'images/platz');
if (fs.existsSync(platzImgDir)) {
  const files = fs.readdirSync(platzImgDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
  for (const file of files) {
    await uploadFile(path.join(platzImgDir, file), folderPlatz);
    log('  ↑', file);
  }
}

// ── Hero-Bilder hochladen ─────────────────────────────────────────────────────
log('🏔️', 'Hero-Bilder hochladen...');
const heroImgDir = path.join(PUBLIC_DIR, 'images/hero');
if (fs.existsSync(heroImgDir)) {
  const files = fs.readdirSync(heroImgDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
  for (const file of files) {
    await uploadFile(path.join(heroImgDir, file), folderHero);
    log('  ↑', file);
  }
}

// ── Team-Records mit Bild-ID verknüpfen ──────────────────────────────────────
log('🔗', 'Team-Records mit Bildern verknüpfen...');
const teamItems = await api('/items/team?limit=100');
for (const item of teamItems.data ?? []) {
  if (!item.bild) continue;
  // item.bild ist z.B. "/images/team/alexander-wolf.jpg"
  const filename = path.basename(item.bild);
  const fileId = teamImgMap[filename];
  if (fileId) {
    await api(`/items/team/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bild: fileId }),
    });
    log('  ✓', `${item.name} → ${filename}`);
  }
}

// ── Clubmeister-Records mit Bild-IDs verknüpfen ───────────────────────────────
log('🔗', 'Clubmeister-Records mit Bildern verknüpfen...');
const cmItems = await api('/items/clubmeister?limit=100');
for (const item of cmItems.data ?? []) {
  const updates = {};
  for (const field of ['herren_bild', 'damen_bild', 'senioren_bild', 'seniorinnen_bild']) {
    if (item[field]) {
      const filename = path.basename(item[field]);
      const fileId = cmImgMap[filename];
      if (fileId) updates[field] = fileId;
    }
  }
  if (Object.keys(updates).length > 0) {
    await api(`/items/clubmeister/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    log('  ✓', `Clubmeister ${item.jahr}`);
  }
}

log('🎉', 'Alle Bilder hochgeladen und verknüpft!');
log('📷', `File-Manager: http://localhost:8055/admin/files`);
