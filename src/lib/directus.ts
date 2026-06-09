/**
 * Directus API Client für GC Schwäbisch Hall
 *
 * Lokal:      http://localhost:8055
 * Produktion: https://cms.gc-sha.de  (über DIRECTUS_URL env)
 */

const DIRECTUS_URL = import.meta.env.DIRECTUS_URL ?? 'http://localhost:8055';
const DIRECTUS_TOKEN = import.meta.env.DIRECTUS_TOKEN ?? '';

const headers: Record<string, string> = {
  'Content-Type': 'application/json',
};
if (DIRECTUS_TOKEN) {
  headers['Authorization'] = `Bearer ${DIRECTUS_TOKEN}`;
}

async function fetchDirectus<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${DIRECTUS_URL}${path}`, { headers });
    if (!res.ok) {
      console.error(`Directus Fehler ${res.status} für ${path}`);
      return null;
    }
    const json = await res.json();
    return json.data as T;
  } catch (e) {
    console.error(`Directus nicht erreichbar (${path}):`, e);
    return null;
  }
}

// ── Typen ─────────────────────────────────────────────────────────────────────

export interface DirectusFile {
  id: string;
  filename_download: string;
  title: string;
}

export interface TeamMitglied {
  id: number;
  name: string;
  rolle: string;
  gruppe: string;
  bild: string | DirectusFile | null;
  reihenfolge: number;
}

export interface HoleInOne {
  id: number;
  name: string;
  datum: string;
  bahn: number;
}

export interface Mannschaft {
  id: number;
  name: string;
  ligen: { liga: string; aktiv: boolean }[];
  beschreibung: string;
  reihenfolge: number;
}

export interface Clubmeister {
  id: number;
  jahr: number;
  herren: string;
  damen: string;
  senioren: string;
  seniorinnen: string;
  jugend: string;
  brutto: string;
  herren_bild: string | DirectusFile | null;
  damen_bild: string | DirectusFile | null;
  senioren_bild: string | DirectusFile | null;
  seniorinnen_bild: string | DirectusFile | null;
}

export interface Event {
  id: number;
  titel: string;
  datum_von: string;
  datum_bis: string | null;
  typ: string;
  beschreibung: string;
  ort: string;
  anmeldelink: string;
  highlight: boolean;
}

export interface NewsArtikel {
  id: number;
  status: string;
  datum: string;
  titel: string;
  slug: string;
  zusammenfassung: string;
  bild: string | DirectusFile | null;
  inhalt: string;
  kategorie: string;
  highlight: boolean;
  seo_titel: string;
  seo_beschreibung: string;
}

export interface Spielgebuehren {
  saison: string;
  hinweis: string;
  greenfee18: { kategorie: string; wochentag: string; wochenende: string }[];
  greenfee9:  { kategorie: string; wochentag: string; wochenende: string }[];
  kurzplatz:  { kategorie: string; wochentag: string; wochenende: string }[];
  leihgebuehren: { item: string; preis: string }[];
}

export interface SpielgruppenData {
  gruppen: {
    name: string;
    beschreibung: string;
    termine: { saison: string; uhrzeit: string }[];
    ansprechpartner_titel: string;
    ansprechpartner_name: string;
    telefon: string;
    email: string;
  }[];
}

export interface RestaurantData {
  oeffnungszeiten: { tag: string; zeit: string; ruhetag: boolean }[];
  hinweis: string;
  reservierungTelefon: string;
  reservierungEmail: string;
}

export interface PlatzstatusData {
  hauptplatz: string;
  kurzplatz: string;
  drivingRange: string;
  cafe: string;
  carts: string;
  hinweis: string;
  zeitsteuerung: Record<string, string>;
  sperrzeiten: any[];
}

// ── Bild-URL Helper ───────────────────────────────────────────────────────────

export function bildUrl(bild: string | DirectusFile | null | undefined): string {
  if (!bild) return '';
  if (typeof bild === 'string') return `${DIRECTUS_URL}/assets/${bild}`;
  return `${DIRECTUS_URL}/assets/${bild.id}`;
}

export function bildUrlMitFormat(
  bild: string | DirectusFile | null | undefined,
  opts: { width?: number; height?: number; quality?: number; fit?: string } = {}
): string {
  const base = bildUrl(bild);
  if (!base) return '';
  const params = new URLSearchParams();
  if (opts.width)   params.set('width', String(opts.width));
  if (opts.height)  params.set('height', String(opts.height));
  if (opts.quality) params.set('quality', String(opts.quality));
  if (opts.fit)     params.set('fit', opts.fit);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

// ── API Funktionen ────────────────────────────────────────────────────────────

export async function getTeam(): Promise<TeamMitglied[]> {
  const data = await fetchDirectus<TeamMitglied[]>(
    '/items/team?sort=reihenfolge&limit=100&fields=*,bild.id,bild.filename_download'
  );
  return data ?? [];
}

export async function getHoleInOne(): Promise<HoleInOne[]> {
  const data = await fetchDirectus<HoleInOne[]>(
    '/items/holeinone?sort=-datum&limit=200'
  );
  return data ?? [];
}

export async function getMannschaften(): Promise<Mannschaft[]> {
  const data = await fetchDirectus<Mannschaft[]>(
    '/items/mannschaften?sort=reihenfolge&limit=50'
  );
  return data ?? [];
}

export async function getClubmeister(): Promise<Clubmeister[]> {
  const data = await fetchDirectus<Clubmeister[]>(
    '/items/clubmeister?sort=-jahr&limit=100&fields=*,herren_bild.id,damen_bild.id,senioren_bild.id,seniorinnen_bild.id'
  );
  return data ?? [];
}

export async function getEvents(nurZukuenftige = false): Promise<Event[]> {
  const today = new Date().toISOString().split('T')[0];
  const filter = nurZukuenftige
    ? `&filter[datum_von][_gte]=${today}`
    : '';
  const data = await fetchDirectus<Event[]>(
    `/items/events?sort=datum_von&limit=200${filter}`
  );
  return data ?? [];
}

export async function getNews(opts: {
  nurVeroeffentlicht?: boolean;
  limit?: number;
  nurHighlights?: boolean;
} = {}): Promise<NewsArtikel[]> {
  const params = new URLSearchParams();
  params.set('sort', '-datum');
  params.set('limit', String(opts.limit ?? 50));
  params.set('fields', '*,bild.id,bild.filename_download');
  if (opts.nurVeroeffentlicht) params.set('filter[status][_eq]', 'veroeffentlicht');
  if (opts.nurHighlights) params.set('filter[highlight][_eq]', 'true');
  const data = await fetchDirectus<NewsArtikel[]>(`/items/news?${params}`);
  return data ?? [];
}

export async function getNewsArtikel(slug: string): Promise<NewsArtikel | null> {
  const data = await fetchDirectus<NewsArtikel[]>(
    `/items/news?filter[slug][_eq]=${encodeURIComponent(slug)}&fields=*,bild.id,bild.filename_download&limit=1`
  );
  return data?.[0] ?? null;
}

export async function getSpielgebuehren(): Promise<Spielgebuehren | null> {
  return fetchDirectus<Spielgebuehren>('/items/spielgebuehren');
}

export async function getSpielgruppen(): Promise<SpielgruppenData | null> {
  return fetchDirectus<SpielgruppenData>('/items/spielgruppen');
}

export async function getRestaurant(): Promise<RestaurantData | null> {
  return fetchDirectus<RestaurantData>('/items/restaurant');
}

export async function getPlatzstatus(): Promise<PlatzstatusData | null> {
  return fetchDirectus<PlatzstatusData>('/items/platzstatus');
}
