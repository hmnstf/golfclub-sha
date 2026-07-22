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
  uhrzeit_von: string | null;
  uhrzeit_bis: string | null;
  typ: string;
  beschreibung: string;
  ort: string;
  anmeldelink: string;
  highlight: boolean;
  bild: string | DirectusFile | null;
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
  hero_bild: string | DirectusFile | null;
  greenfee18: { kategorie: string; wochentag: string; wochenende: string }[];
  greenfee9:  { kategorie: string; wochentag: string; wochenende: string }[];
  kurzplatz:  { kategorie: string; wochentag: string; wochenende: string }[];
  leihgebuehren: { item: string; preis: string }[];
}

export interface SpielgruppenData {
  hero_bild: string | DirectusFile | null;
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
  hero_bild: string | DirectusFile | null;
  bild_innen: string | DirectusFile | null;
}


export interface MitgliedschaftModell {
  id: number;
  name: string;
  preis: string;
  preis_hinweis: string | null;
  highlight: boolean;
  reihenfolge: number;
  features: { text: string; enthalten: boolean }[];
  button_text: string;
}

export interface MitgliedschaftData {
  hero_bild: string | DirectusFile | null;
  intro_text: string | null;
  aufnahme_bild: string | DirectusFile | null;
  gemeinschaft_bild: string | DirectusFile | null;
}

export interface GolfErlebenData {
  hero_bild:      string | DirectusFile | null;
  galerie_bild_1: string | DirectusFile | null;
  galerie_bild_2: string | DirectusFile | null;
  galerie_bild_3: string | DirectusFile | null;
  kurzplatz_bild: string | DirectusFile | null;
  platzgrafik:    string | DirectusFile | null;
}

export interface PlatzstatusData {
  hero_bild: string | DirectusFile | null;
  hauptplatz: string;
  kurzplatz: string;
  drivingRange: string;
  cafe: string;
  carts: string;
  hinweis: string;
  // Neue Zeitfelder (ersetzen zeitsteuerung JSON)
  hauptplatz_oeffnet:      string;
  hauptplatz_schliesst:    string;
  kurzplatz_oeffnet:       string;
  kurzplatz_schliesst:     string;
  driving_range_oeffnet:   string;
  driving_range_schliesst: string;
  cafe_oeffnet:            string;
  cafe_schliesst:          string;
  // Legacy (versteckt, aber noch vorhanden)
  zeitsteuerung?: Record<string, string>;
  sperrzeiten?: any[];
}

export interface PlatzstatusKalenderEintrag {
  id: number;
  datum: string;
  hinweis: string | null;
  hauptplatz: string | null;
  kurzplatz: string | null;
  drivingRange: string | null;
  cafe: string | null;
  carts: string | null;
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
    `/items/events?sort=datum_von&limit=200&fields=*,bild.id${filter}`
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
  return fetchDirectus<Spielgebuehren>('/items/spielgebuehren?fields=*,hero_bild.id');
}

export async function getSpielgruppen(): Promise<SpielgruppenData | null> {
  return fetchDirectus<SpielgruppenData>('/items/spielgruppen?fields=*,hero_bild.id');
}

export async function getRestaurant(): Promise<RestaurantData | null> {
  return fetchDirectus<RestaurantData>(
    '/items/restaurant?fields=*,hero_bild.id,bild_innen.id'
  );
}

export async function getPlatzstatus(): Promise<PlatzstatusData | null> {
  return fetchDirectus<PlatzstatusData>('/items/platzstatus?fields=*,hero_bild.id');
}

export async function getPlatzstatusKalenderHeute(): Promise<PlatzstatusKalenderEintrag | null> {
  const today = new Date().toISOString().split('T')[0];
  const data = await fetchDirectus<PlatzstatusKalenderEintrag[]>(
    `/items/platzstatus_kalender?filter[datum][_eq]=${today}&limit=1`
  );
  return data?.[0] ?? null;
}

export async function getPlatzstatusKalender(von?: string, bis?: string): Promise<PlatzstatusKalenderEintrag[]> {
  const params = new URLSearchParams({ sort: 'datum', limit: '90' });
  if (von) params.set('filter[datum][_gte]', von);
  if (bis) params.set('filter[datum][_lte]', bis);
  const data = await fetchDirectus<PlatzstatusKalenderEintrag[]>(`/items/platzstatus_kalender?${params}`);
  return data ?? [];
}

export interface KontaktData {
  hero_bild: string | DirectusFile | null;
  formular_bild: string | DirectusFile | null;
  adresse: string;
  ort: string;
  telefon_sekretariat: string;
  telefon_restaurant: string;
  email: string;
  fax?: string;
  google_maps_embed: string;
  anfahrt_routen: { von: string; text: string }[];
}

export async function getKontakt(): Promise<KontaktData | null> {
  return fetchDirectus<KontaktData>('/items/kontakt?fields=*,hero_bild.id,formular_bild.id');
}


export interface SiteSettings {
  clubName: string;
  telefon: string;
  email: string;
  adresse: string;
  instagram: string;
  pccaddieUrl: string;
  recaptcha_site_key: string | null;
  bild_startseite:   string | DirectusFile | null;
  bild_club:         string | DirectusFile | null;
  bild_clubmeister:  string | DirectusFile | null;
  bild_mannschaften: string | DirectusFile | null;
  bild_holeinone:    string | DirectusFile | null;
  bild_turniere:     string | DirectusFile | null;
  bild_firmenevents: string | DirectusFile | null;
  bild_golf_lernen:  string | DirectusFile | null;
  bild_golf_lernen_training: string | DirectusFile | null;
  bild_historie:     string | DirectusFile | null;
  bild_rundung:      number | null;
  schriftgroesse:    number | null;
}

export async function getSettings(): Promise<SiteSettings | null> {
  return fetchDirectus<SiteSettings>(
    '/items/settings/1?fields=*,bild_startseite.id,bild_club.id,bild_clubmeister.id,bild_mannschaften.id,bild_holeinone.id,bild_turniere.id,bild_firmenevents.id,bild_golf_lernen.id,bild_golf_lernen_training.id,bild_historie.id'
  );
}

export async function getGolfErleben(): Promise<GolfErlebenData | null> {
  return fetchDirectus<GolfErlebenData>(
    '/items/golf_erleben?fields=*,hero_bild.id,galerie_bild_1.id,galerie_bild_2.id,galerie_bild_3.id,kurzplatz_bild.id,platzgrafik.id'
  );
}

export async function getMitgliedschaft(): Promise<MitgliedschaftData | null> {
  return fetchDirectus<MitgliedschaftData>(
    '/items/mitgliedschaft?fields=*,hero_bild.id,aufnahme_bild.id,gemeinschaft_bild.id'
  );
}

export async function getMitgliedschaftModelle(): Promise<MitgliedschaftModell[]> {
  const data = await fetchDirectus<MitgliedschaftModell[]>(
    '/items/mitgliedschaft_modelle?sort=reihenfolge&limit=20'
  );
  return data ?? [];
}

export interface Partner {
  id: number;
  name: string;
  kategorie: 'hotel' | 'shop' | 'sonstige';
  logo: string | DirectusFile | null;
  url: string | null;
  aktiv: boolean;
}

export async function getPartner(): Promise<Partner[]> {
  const data = await fetchDirectus<Partner[]>(
    '/items/partner?fields=*,logo.id&filter[aktiv][_eq]=true&sort=sort'
  );
  return data ?? [];
}

export interface Partnerhotel {
  id: number;
  name: string;
  aktiv: boolean;
  adresse: string | null;
  ort: string | null;
  telefon: string | null;
  fax: string | null;
  email: string | null;
  website: string | null;
}

export async function getPartnerhotels(): Promise<Partnerhotel[]> {
  const data = await fetchDirectus<Partnerhotel[]>(
    '/items/partnerhotels?filter[aktiv][_eq]=true&sort=sort'
  );
  return data ?? [];
}
