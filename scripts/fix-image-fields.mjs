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
  try { return JSON.parse(text); } catch { return { _raw: text }; }
};

// team.bild: string → file
let r = await api('/fields/team/bild', { method: 'DELETE' });
console.log('DELETE team.bild:', r.errors ? JSON.stringify(r.errors) : 'ok');

r = await api('/fields/team', { method: 'POST', body: {
  field: 'bild', type: 'uuid',
  meta: { interface: 'file-image', display: 'image', note: 'Profilfoto' },
  schema: { is_nullable: true },
}});
console.log('CREATE team.bild:', r.errors ? JSON.stringify(r.errors) : 'ok');

r = await api('/relations', { method: 'POST', body: {
  collection: 'team', field: 'bild',
  related_collection: 'directus_files',
}});
console.log('RELATION team.bild:', r.errors ? JSON.stringify(r.errors) : 'ok');

// clubmeister Bildfelder
for (const field of ['herren_bild','damen_bild','senioren_bild','seniorinnen_bild']) {
  r = await api(`/fields/clubmeister/${field}`, { method: 'DELETE' });
  console.log(`DELETE clubmeister.${field}:`, r.errors ? JSON.stringify(r.errors) : 'ok');

  r = await api('/fields/clubmeister', { method: 'POST', body: {
    field, type: 'uuid',
    meta: { interface: 'file-image', display: 'image' },
    schema: { is_nullable: true },
  }});
  console.log(`CREATE clubmeister.${field}:`, r.errors ? JSON.stringify(r.errors) : 'ok');

  r = await api('/relations', { method: 'POST', body: {
    collection: 'clubmeister', field,
    related_collection: 'directus_files',
  }});
  console.log(`RELATION clubmeister.${field}:`, r.errors ? JSON.stringify(r.errors) : 'ok');
}
