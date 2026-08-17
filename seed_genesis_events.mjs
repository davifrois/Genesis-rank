/**
 * seed_genesis_events.mjs
 * Cadastra os campeonatos do Genesis Esportes (clonados de genesisesportes.com.br)
 * via API REST local.
 *
 * Uso: node seed_genesis_events.mjs
 */

const API_BASE = 'http://localhost:8080';
const AUTH_URL = `${API_BASE}/api/auth/login`;
const EVENTS_URL = `${API_BASE}/api/events`;

// Credenciais de admin (ajuste se necessário)
const ADMIN_USERNAME = 'davifrois';
const ADMIN_PASSWORD = 'Davifrois324@';

// ─── Campeonatos do Genesis Esportes (genesisesportes.com.br) ───
const championships = [
  {
    name: 'Diamantes do Vale',
    date: '2026-08-16',
    location: 'Itamarandiba, MG',
    city: 'Itamarandiba',
    state: 'MG',
    country: 'Brasil',
    isPremium: true,
    registrationOpen: true,
    internalRegistration: false,
    publicPublished: true,
    eventDescription: 'Campeonato de Jiu-Jitsu Diamantes do Vale – Aqui a pressão lapida campeões. Premiação por faixa no absoluto.',
    registrationUrl: 'https://genesisesportes.com.br',
  },
  {
    name: 'VII Copa Divinolândia de Jiu-Jitsu',
    date: '2026-08-16',
    location: 'Divinolândia, MG',
    city: 'Divinolândia',
    state: 'MG',
    country: 'Brasil',
    isPremium: true,
    registrationOpen: true,
    internalRegistration: false,
    publicPublished: true,
    eventDescription: '7ª edição da Copa Divinolândia de Jiu-Jitsu, realizado na Escola Rui Barbosa. Categorias: Infantil, Juvenil, Adulto, Para-Jiu-Jitsu e Absoluto.',
    registrationUrl: 'https://genesisesportes.com.br',
  },
  {
    name: 'Provérbios Jiu-Jitsu Servo Dênis',
    date: '2026-08-30',
    location: 'São José da Lapa, MG',
    city: 'São José da Lapa',
    state: 'MG',
    country: 'Brasil',
    isPremium: true,
    registrationOpen: true,
    internalRegistration: false,
    publicPublished: true,
    eventDescription: '16º Campeonato Provérbios Jiu-Jitsu Servo Dênis – Honra seu pai e sua mãe. Local: Escola Terezinha de Jesus.',
    registrationUrl: 'https://genesisesportes.com.br',
  },
  {
    name: 'JJFA – 11ª Edição Disputa de Cinturão',
    date: '2026-09-13',
    location: 'Belo Horizonte, MG',
    city: 'Belo Horizonte',
    state: 'MG',
    country: 'Brasil',
    isPremium: true,
    registrationOpen: true,
    internalRegistration: false,
    publicPublished: true,
    eventDescription: 'JJFA 11ª Edição – Disputa de Cinturão em Belo Horizonte. Faixas Pretas Lutas ao Vivo no YouTube.',
    registrationUrl: 'https://genesisesportes.com.br',
  },
  {
    name: 'LFC – Luz Fight Championship Jiu-Jitsu',
    date: '2026-09-27',
    location: 'Luz, MG',
    city: 'Luz',
    state: 'MG',
    country: 'Brasil',
    isPremium: true,
    registrationOpen: true,
    internalRegistration: false,
    publicPublished: true,
    eventDescription: 'Luz Fight Championship – Jiu-Jitsu Gi e No-Gi. Local: Poliesportivo Prefeito José Ferreira. Valor: R$ 25,00 + 1 pacote de fralda.',
    registrationUrl: 'https://genesisesportes.com.br',
    feeUnder15: 25,
    feeOver15: 25,
  },
  {
    name: 'Open Brumadinho',
    date: '2026-09-27',
    location: 'Brumadinho, MG',
    city: 'Brumadinho',
    state: 'MG',
    country: 'Brasil',
    isPremium: true,
    registrationOpen: true,
    internalRegistration: false,
    publicPublished: true,
    eventDescription: 'Open Brumadinho – Campeonato de Jiu-Jitsu em Brumadinho, MG.',
    registrationUrl: 'https://genesisesportes.com.br',
  },
  {
    name: '2° Campeonato Dom Joaquinense de Jiu-Jitsu',
    date: '2026-11-01',
    location: 'Dom Joaquim, MG',
    city: 'Dom Joaquim',
    state: 'MG',
    country: 'Brasil',
    isPremium: true,
    registrationOpen: true,
    internalRegistration: false,
    publicPublished: true,
    eventDescription: '2° Campeonato Dom Joaquinense de Jiu-Jitsu – Local: Complexo da Barragem, Dom Joaquim/MG.',
    registrationUrl: 'https://genesisesportes.com.br',
  },
  {
    name: '9ª Copa Leste Minas BJJ 2026',
    date: '2026-11-29',
    location: 'Timóteo, MG',
    city: 'Timóteo',
    state: 'MG',
    country: 'Brasil',
    isPremium: true,
    registrationOpen: true,
    internalRegistration: false,
    publicPublished: true,
    eventDescription: '9ª Copa Leste Minas BJJ 2026 – Gi e No-Gi, todas as categorias, todas as idades. Lutas Ganhas valendo Cinturão. Timóteo/MG.',
    registrationUrl: 'https://genesisesportes.com.br',
  },
  {
    name: 'Open Sarzedo – III Edição',
    date: '2026-12-13',
    location: 'Sarzedo, MG',
    city: 'Sarzedo',
    state: 'MG',
    country: 'Brasil',
    isPremium: true,
    registrationOpen: true,
    internalRegistration: false,
    publicPublished: true,
    eventDescription: 'Open Sarzedo III Edição – Kids, Juvenil, Adulto e Master. Premiação em dinheiro. Sarzedo/MG. Contato: 31 9 7207-7729.',
    registrationUrl: 'https://genesisesportes.com.br',
  },
];

async function login() {
  console.log(`\n🔐 Fazendo login como "${ADMIN_USERNAME}"...`);
  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login falhou (${res.status}): ${text}`);
  }
  const data = await res.json();
  const token = data?.token || data?.accessToken || data?.access_token || '';
  if (!token) throw new Error('Token não encontrado na resposta do login.');
  console.log(`✅ Login OK. Token obtido.`);
  return token;
}

async function createEvent(token, payload) {
  const res = await fetch(EVENTS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`(${res.status}): ${text}`);
  }
  return await res.json();
}

(async () => {
  try {
    const token = await login();
    console.log(`\n📋 Cadastrando ${championships.length} campeonatos...\n`);

    const results = [];
    for (const champ of championships) {
      try {
        process.stdout.write(`  ➤ ${champ.name}... `);
        const created = await createEvent(token, champ);
        const id = created?.id || created?.eventId || '(sem id)';
        console.log(`✅ criado! ID: ${id}`);
        results.push({ name: champ.name, status: 'ok', id });
      } catch (err) {
        console.log(`❌ ERRO: ${err.message}`);
        results.push({ name: champ.name, status: 'error', error: err.message });
      }
    }

    console.log('\n─────────────────────────────────────────');
    const ok = results.filter(r => r.status === 'ok');
    const fail = results.filter(r => r.status === 'error');
    console.log(`✅ Criados: ${ok.length}/${results.length}`);
    if (fail.length) {
      console.log(`❌ Falhas:`);
      fail.forEach(f => console.log(`   - ${f.name}: ${f.error}`));
    }
    console.log('─────────────────────────────────────────\n');
  } catch (err) {
    console.error('\n💥 Erro fatal:', err.message);
    process.exit(1);
  }
})();
