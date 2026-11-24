import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Supabase client initialization (uses publishable key for anon requests)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qxuzpeqsejcyhvzxoict.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_Fphgp3vWPTeVt29jqhzg4g_0qXEPC_l';
const SUPABASE_ORIGIN = new URL(SUPABASE_URL).origin;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Same-origin proxy for Supabase HTTP requests (Auth, REST, Storage) to prevent browser Failed to fetch errors
const ALLOWED_PROXY_REQ_HEADERS = new Set([
  'apikey',
  'authorization',
  'content-type',
  'accept',
  'prefer',
  'range',
  'x-client-info',
  'x-supabase-api-version',
  'accept-profile',
  'content-profile',
  'x-upsert',
  'cache-control',
  'if-none-match',
  'if-modified-since',
]);

const STRIP_PROXY_RES_HEADERS = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
  'set-cookie',
]);

app.use('/api/supabase', async (req: Request, res: Response) => {
  try {
    const targetUrl = new URL(req.url, SUPABASE_URL);
    if (targetUrl.origin !== SUPABASE_ORIGIN) {
      res.status(400).json({ error: 'Invalid proxy target' });
      return;
    }

    const headers: Record<string, string> = {};
    for (const [key, val] of Object.entries(req.headers)) {
      const lower = key.toLowerCase();
      if (ALLOWED_PROXY_REQ_HEADERS.has(lower) && val !== undefined) {
        headers[lower] = Array.isArray(val) ? val.join(', ') : val;
      }
    }
    if (!headers['apikey']) {
      headers['apikey'] = SUPABASE_KEY;
    }

    let body: Buffer | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      if (chunks.length > 0) {
        body = Buffer.concat(chunks);
      }
    }

    const upstreamRes = await fetch(targetUrl.toString(), {
      method: req.method,
      headers,
      body: body ? new Uint8Array(body) : undefined,
      redirect: 'manual',
    });

    res.status(upstreamRes.status);
    upstreamRes.headers.forEach((value, key) => {
      if (!STRIP_PROXY_RES_HEADERS.has(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    if (upstreamRes.status === 204 || upstreamRes.status === 304 || req.method === 'HEAD') {
      res.end();
      return;
    }

    const arrayBuf = await upstreamRes.arrayBuffer();
    res.send(Buffer.from(arrayBuf));
  } catch (err: any) {
    console.error('[Supabase Proxy Error]:', err?.message || err);
    res.status(502).json({
      error: 'supabase_proxy_error',
      message: 'Falha ao comunicar com o servidor de autenticação.',
    });
  }
});

// Parse JSON request bodies with support for photo uploads (up to 25MB)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// ==========================================
// RATE LIMITING & ATTEMPTS STORE (BACKEND)
// ==========================================
// Max 5 failed attempts; 30 minutes lockout window.
// Rate limiting is kept in-memory and survives across client F5/reloads.
interface RateLimitRecord {
  failedAttempts: number;
  lockedUntil: number | null;
}

const attemptStore = new Map<string, RateLimitRecord>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 30 * 60 * 1000; // 30 minutos

// Clean non-digits
function normalizeDigits(val: string): string {
  return (val || '').replace(/\D/g, '');
}

// Modulo 11 check for Brazilian CPF
function validateCpfAlgorithm(cpf: string): boolean {
  const clean = normalizeDigits(cpf);
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let firstRemainder = (sum * 10) % 11;
  if (firstRemainder === 10 || firstRemainder === 11) firstRemainder = 0;
  if (firstRemainder !== parseInt(clean.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  let secondRemainder = (sum * 10) % 11;
  if (secondRemainder === 10 || secondRemainder === 11) secondRemainder = 0;
  if (secondRemainder !== parseInt(clean.charAt(10), 10)) return false;

  return true;
}

// Generates a luxury default Onze Lounge digital beverage card image (SVG Data URL)
function generateBeveragesCardSvg(clientName = 'Cliente VIP'): string {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 440" width="680" height="440">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#14151B" />
      <stop offset="50%" stop-color="#0E0F13" />
      <stop offset="100%" stop-color="#08090A" />
    </linearGradient>
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#C58A3A" />
      <stop offset="50%" stop-color="#DFAC62" />
      <stop offset="100%" stop-color="#B87D2E" />
    </linearGradient>
    <linearGradient id="goldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#DFAC62" />
      <stop offset="40%" stop-color="#C58A3A" />
      <stop offset="70%" stop-color="#3D301C" />
      <stop offset="100%" stop-color="#DFAC62" />
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.8" />
    </filter>
  </defs>

  <!-- Base Card Frame -->
  <rect x="10" y="10" width="660" height="420" rx="24" fill="url(#bgGrad)" stroke="url(#goldBorder)" stroke-width="1.8" filter="url(#shadow)" />
  
  <!-- Subtle Internal Gold Border -->
  <rect x="18" y="18" width="644" height="404" rx="18" fill="none" stroke="#C58A3A" stroke-opacity="0.15" stroke-width="1" stroke-dasharray="4,4" />

  <!-- Card Header -->
  <g transform="translate(40, 42)">
    <rect x="0" y="0" width="46" height="46" rx="12" fill="#1C1E26" stroke="#C58A3A" stroke-width="1.2" />
    <text x="23" y="30" fill="#DFAC62" font-family="serif" font-size="20" font-weight="bold" text-anchor="middle">XI</text>

    <text x="62" y="22" fill="#FFFFFF" font-family="serif" font-size="22" font-weight="bold" letter-spacing="1">ONZE LOUNGE</text>
    <text x="62" y="38" fill="#DFAC62" font-family="sans-serif" font-size="11" font-weight="600" letter-spacing="2">GARRAFAS ARMAZENADAS • COMANDA DIGITAL</text>

    <rect x="470" y="8" width="130" height="26" rx="13" fill="#1C1D24" stroke="#C58A3A" stroke-width="1" />
    <circle cx="484" cy="21" r="5" fill="#34D399" />
    <text x="496" y="25" fill="#DFAC62" font-family="sans-serif" font-size="10" font-weight="bold">AUTENTICADO</text>
  </g>

  <!-- Divider Line -->
  <line x1="40" y1="110" x2="640" y2="110" stroke="#252733" stroke-width="1" />
  
  <!-- Section Subtitle -->
  <text x="40" y="142" fill="#9CA3AF" font-family="sans-serif" font-size="11" font-weight="bold" letter-spacing="1.5">FOTO ATUAL DAS BEBIDAS GUARDADAS</text>
  <text x="640" y="142" fill="#DFAC62" font-family="monospace" font-size="12" font-weight="bold" text-anchor="end">STATUS: ARMAZENADO</text>

  <!-- Beverage Item 1 -->
  <g transform="translate(40, 165)">
    <rect width="600" height="85" rx="14" fill="#15171E" stroke="#252733" stroke-width="1.2" />
    <circle cx="42" cy="42" r="24" fill="#1D202A" stroke="#C58A3A" stroke-width="1" />
    <path d="M 39 30 L 45 30 L 45 36 L 48 41 L 48 53 L 36 53 L 36 41 L 39 36 Z" fill="#C58A3A" opacity="0.9" />
    <line x1="37" y1="47" x2="47" y2="47" stroke="#08090A" stroke-width="1.5" />
    <text x="82" y="36" fill="#FFFFFF" font-family="sans-serif" font-size="17" font-weight="bold">Jack Daniel&apos;s Old No. 7</text>
    <text x="82" y="54" fill="#C58A3A" font-family="sans-serif" font-size="11" font-weight="600" letter-spacing="0.5">GARRAFA ARMAZENADA NO LOUNGE</text>
    <text x="560" y="36" fill="#C58A3A" font-family="monospace" font-size="14" font-weight="bold" text-anchor="end">75% restante</text>
    <rect x="82" y="62" width="300" height="8" rx="4" fill="#0C0D10" stroke="#1F212A" stroke-width="1" />
    <rect x="82" y="62" width="225" height="8" rx="4" fill="url(#goldGradient)" />
  </g>

  <!-- Beverage Item 2 -->
  <g transform="translate(40, 265)">
    <rect width="600" height="85" rx="14" fill="#15171E" stroke="#252733" stroke-width="1.2" />
    <circle cx="42" cy="42" r="24" fill="#1D202A" stroke="#C58A3A" stroke-width="1" />
    <path d="M 39 30 L 45 30 L 45 36 L 48 41 L 48 53 L 36 53 L 36 41 L 39 36 Z" fill="#C58A3A" opacity="0.9" />
    <line x1="37" y1="47" x2="47" y2="47" stroke="#08090A" stroke-width="1.5" />
    <text x="82" y="36" fill="#FFFFFF" font-family="sans-serif" font-size="17" font-weight="bold">Gin Hendrick&apos;s London</text>
    <text x="82" y="54" fill="#C58A3A" font-family="sans-serif" font-size="11" font-weight="600" letter-spacing="0.5">GARRAFA ARMAZENADA NO LOUNGE</text>
    <text x="560" y="36" fill="#C58A3A" font-family="monospace" font-size="14" font-weight="bold" text-anchor="end">100% restante</text>
    <rect x="82" y="62" width="300" height="8" rx="4" fill="#0C0D10" stroke="#1F212A" stroke-width="1" />
    <rect x="82" y="62" width="300" height="8" rx="4" fill="url(#goldGradient)" />
  </g>

  <!-- Footer Seal -->
  <g transform="translate(40, 395)">
    <line x1="0" y1="0" x2="600" y2="0" stroke="#22242D" stroke-width="1" />
    <text x="0" y="20" fill="#6B7280" font-family="sans-serif" font-size="11">Onze Lounge &amp; Bar • Registro de garrafas armazenadas</text>
    <text x="600" y="20" fill="#C58A3A" font-family="sans-serif" font-size="11" font-weight="600" text-anchor="end">Exclusividade &amp; Segurança</text>
  </g>
</svg>
`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// ==========================================
// CLIENTS & PHOTO STORAGE BACKEND
// ==========================================
export interface StoredClient {
  id: string;
  fullName: string;
  cpf: string;
  cpfNormalized: string;
  phone: string;
  phoneNormalized: string;
  phoneLast4: string;
  beveragePhotoUrl: string;
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.resolve(__dirname, 'data');
const CLIENTS_FILE = path.resolve(DATA_DIR, 'clients.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadClients(): StoredClient[] {
  ensureDataDir();
  if (!fs.existsSync(CLIENTS_FILE)) {
    const initialClients: StoredClient[] = [
      {
        id: 'c1-leonardo',
        fullName: 'Leonardo Sabbadin',
        cpf: '702.027.821-31',
        cpfNormalized: '70202782131',
        phone: '(62) 99999-1234',
        phoneNormalized: '62999991234',
        phoneLast4: '1234',
        beveragePhotoUrl: generateBeveragesCardSvg('Leonardo Sabbadin'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    saveClients(initialClients);
    return initialClients;
  }

  try {
    const raw = fs.readFileSync(CLIENTS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const initialClients: StoredClient[] = [
        {
          id: 'c1-leonardo',
          fullName: 'Leonardo Sabbadin',
          cpf: '702.027.821-31',
          cpfNormalized: '70202782131',
          phone: '(62) 99999-1234',
          phoneNormalized: '62999991234',
          phoneLast4: '1234',
          beveragePhotoUrl: generateBeveragesCardSvg('Leonardo Sabbadin'),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      saveClients(initialClients);
      return initialClients;
    }

    // Ensure Leonardo has a photo if empty
    let updated = false;
    for (const c of parsed) {
      if (c.cpfNormalized === '70202782131' && (!c.beveragePhotoUrl || c.beveragePhotoUrl === '')) {
        c.beveragePhotoUrl = generateBeveragesCardSvg(c.fullName || 'Leonardo Sabbadin');
        updated = true;
      }
      if (!c.phoneLast4 && c.phoneNormalized) {
        c.phoneLast4 = c.phoneNormalized.slice(-4);
        updated = true;
      }
    }
    if (updated) {
      saveClients(parsed);
    }

    return parsed;
  } catch (err) {
    console.error('[Error reading clients.json]:', err);
    return [];
  }
}

function saveClients(clients: StoredClient[]) {
  ensureDataDir();
  fs.writeFileSync(CLIENTS_FILE, JSON.stringify(clients, null, 2), 'utf-8');
}

// ==========================================
// MOVEMENTS & AUDIT STORE (BACKEND)
// ==========================================
export interface StoredMovement {
  id: string;
  clientId: string;
  clientName: string;
  actionType: 'ADD' | 'SUBSTITUTE' | 'RESCUE';
  description: string;
  createdAt: string;
}

const MOVEMENTS_FILE = path.resolve(DATA_DIR, 'movements.json');

function loadMovements(): StoredMovement[] {
  ensureDataDir();
  if (!fs.existsSync(MOVEMENTS_FILE)) {
    const clients = loadClients();
    const initialMovements: StoredMovement[] = [];
    for (const c of clients) {
      if (c.beveragePhotoUrl && c.beveragePhotoUrl.trim().length > 0) {
        initialMovements.push({
          id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          clientId: c.id,
          clientName: c.fullName,
          actionType: 'ADD',
          description: `Bebida adicionada para ${c.fullName}`,
          createdAt: c.createdAt || new Date().toISOString(),
        });
      }
    }
    saveMovements(initialMovements);
    return initialMovements;
  }

  try {
    const raw = fs.readFileSync(MOVEMENTS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('[Error reading movements.json]:', err);
    return [];
  }
}

function saveMovements(movements: StoredMovement[]) {
  ensureDataDir();
  fs.writeFileSync(MOVEMENTS_FILE, JSON.stringify(movements, null, 2), 'utf-8');
}

function recordMovement(params: {
  clientId: string;
  clientName: string;
  actionType: 'ADD' | 'SUBSTITUTE' | 'RESCUE';
  description: string;
  createdAt?: string;
}): StoredMovement {
  const movements = loadMovements();
  const newMov: StoredMovement = {
    id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    clientId: params.clientId,
    clientName: params.clientName,
    actionType: params.actionType,
    description: params.description,
    createdAt: params.createdAt || new Date().toISOString(),
  };
  movements.unshift(newMov);
  saveMovements(movements);
  return newMov;
}

// ==========================================
// API ADMIN: Cadastrar / Editar Cliente & Foto
// ==========================================
// 1. Obter todos os clientes cadastrados com foto
app.get('/api/admin/clients', (_req: Request, res: Response) => {
  const clients = loadClients();
  res.json({ clients });
});

// 2. Obter dados de um cliente específico
app.get('/api/admin/clients/:id', (req: Request, res: Response) => {
  const clients = loadClients();
  const client = clients.find((c) => c.id === req.params.id);
  if (!client) {
    res.status(404).json({ error: 'Cliente não encontrado' });
    return;
  }
  res.json({ client });
});

// 3. Cadastrar ou Atualizar Cliente
// O sistema calcula automaticamente os ÚLTIMOS 4 DÍGITOS do telefone.
app.post('/api/admin/clients', (req: Request, res: Response) => {
  try {
    const { id, fullName, cpf, phone, beveragePhotoUrl } = req.body || {};

    if (!fullName || !fullName.trim()) {
      res.status(400).json({ error: 'Nome do cliente é obrigatório.' });
      return;
    }

    const cleanCpf = normalizeDigits(cpf);
    if (!cleanCpf) {
      res.status(400).json({ error: 'CPF é obrigatório.' });
      return;
    }

    const cleanPhone = normalizeDigits(phone);
    if (!cleanPhone || cleanPhone.length < 4) {
      res.status(400).json({ error: 'Telefone completo é obrigatório (mínimo 4 dígitos).' });
      return;
    }

    // Calcula automaticamente os ÚLTIMOS 4 DÍGITOS do telefone
    const phoneLast4 = cleanPhone.slice(-4);

    const clients = loadClients();
    const existingIndex = clients.findIndex(
      (c) => (id && c.id === id) || c.cpfNormalized === cleanCpf
    );

    const now = new Date().toISOString();

    let clientRecord: StoredClient;
    let recordedMov: StoredMovement | null = null;

    if (existingIndex >= 0) {
      const oldClient = clients[existingIndex];
      const oldPhoto = (oldClient.beveragePhotoUrl || '').trim();
      const newPhoto = beveragePhotoUrl !== undefined ? (beveragePhotoUrl || '').trim() : oldPhoto;

      // Editar cliente existente
      clientRecord = {
        ...oldClient,
        fullName: fullName.trim(),
        cpf: cpf.trim(),
        cpfNormalized: cleanCpf,
        phone: phone.trim(),
        phoneNormalized: cleanPhone,
        phoneLast4,
        beveragePhotoUrl: newPhoto,
        updatedAt: now,
      };
      clients[existingIndex] = clientRecord;

      // 1. Se cliente não tinha foto e agora tem: Bebida adicionada para [Nome]
      if (!oldPhoto && newPhoto) {
        recordedMov = recordMovement({
          clientId: clientRecord.id,
          clientName: clientRecord.fullName,
          actionType: 'ADD',
          description: `Bebida adicionada para ${clientRecord.fullName}`,
          createdAt: now,
        });
      }
      // 2. Se cliente já tinha foto e a foto foi substituída: Foto das bebidas atualizada para [Nome]
      else if (oldPhoto && newPhoto && oldPhoto !== newPhoto) {
        recordedMov = recordMovement({
          clientId: clientRecord.id,
          clientName: clientRecord.fullName,
          actionType: 'SUBSTITUTE',
          description: `Foto das bebidas atualizada para ${clientRecord.fullName}`,
          createdAt: now,
        });
      }
      // 3. Se cliente tinha foto e agora foi removida: Bebida resgatada por [Nome]
      else if (oldPhoto && !newPhoto) {
        recordedMov = recordMovement({
          clientId: clientRecord.id,
          clientName: clientRecord.fullName,
          actionType: 'RESCUE',
          description: `Bebida resgatada por ${clientRecord.fullName}`,
          createdAt: now,
        });
      }
    } else {
      // Cadastrar novo cliente
      const newPhoto = (beveragePhotoUrl || '').trim();
      clientRecord = {
        id: id || `client-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        fullName: fullName.trim(),
        cpf: cpf.trim(),
        cpfNormalized: cleanCpf,
        phone: phone.trim(),
        phoneNormalized: cleanPhone,
        phoneLast4,
        beveragePhotoUrl: newPhoto,
        createdAt: now,
        updatedAt: now,
      };
      clients.unshift(clientRecord);

      // Se novo cliente já possui foto de bebida guardada: Bebida adicionada para [Nome]
      if (newPhoto) {
        recordedMov = recordMovement({
          clientId: clientRecord.id,
          clientName: clientRecord.fullName,
          actionType: 'ADD',
          description: `Bebida adicionada para ${clientRecord.fullName}`,
          createdAt: now,
        });
      }
    }

    saveClients(clients);

    res.json({
      success: true,
      client: clientRecord,
      movement: recordedMov,
      message: 'Cliente e foto das bebidas salvos com sucesso.',
    });
  } catch (err: any) {
    console.error('[Error saving client]:', err);
    res.status(500).json({ error: 'Erro ao salvar cliente: ' + (err.message || 'Erro interno') });
  }
});

// 4. Remover / Resgatar Foto Atual das Bebidas de um Cliente
app.delete('/api/admin/clients/:id/photo', (req: Request, res: Response) => {
  try {
    const clients = loadClients();
    const client = clients.find((c) => c.id === req.params.id);
    if (!client) {
      res.status(404).json({ error: 'Cliente não encontrado' });
      return;
    }

    const hadPhoto = Boolean(client.beveragePhotoUrl && client.beveragePhotoUrl.trim().length > 0);
    const now = new Date().toISOString();

    client.beveragePhotoUrl = '';
    client.updatedAt = now;
    saveClients(clients);

    let recordedMov: StoredMovement | null = null;
    if (hadPhoto) {
      recordedMov = recordMovement({
        clientId: client.id,
        clientName: client.fullName,
        actionType: 'RESCUE',
        description: `Bebida resgatada por ${client.fullName}`,
        createdAt: now,
      });
    }

    res.json({
      success: true,
      message: 'Foto das bebidas removida com sucesso.',
      movement: recordedMov,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao remover foto: ' + (err.message || 'Erro interno') });
  }
});

// 5. Obter histórico de movimentações de auditoria
app.get('/api/admin/movements', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string, 10) || 200;
  const movements = loadMovements();
  res.json({ movements: movements.slice(0, limit) });
});

// 6. Estatísticas oficiais consolidadas do Dashboard
app.get('/api/admin/dashboard-stats', (_req: Request, res: Response) => {
  const clients = loadClients();
  const movements = loadMovements();

  const totalClients = clients.length;
  const clientsWithBeverages = clients.filter(
    (c) => Boolean(c.beveragePhotoUrl && c.beveragePhotoUrl.trim().length > 0)
  ).length;

  // "BEBIDAS EM GUARDA": Esse card deve representar a quantidade de CLIENTES que atualmente possuem bebidas/foto ativa.
  const totalActiveItems = clientsWithBeverages;
  const totalMovements = movements.length;

  res.json({
    totalClients,
    clientsWithBeverages,
    totalActiveItems,
    totalMovements,
  });
});

// ==========================================
// API ROUTE: /api/consultar-bebidas (CONSULTA PÚBLICA)
// ==========================================
// REGRAS:
// 1. O cliente NÃO faz login.
// 2. Informa: CPF completo + Últimos 4 dígitos do telefone.
// 3. A consulta só pode retornar resultado se CPF + últimos 4 dígitos pertencerem ao MESMO cliente.
// 4. Não fazer SELECT livre de clientes diretamente pelo frontend.
// 5. Se estiver correto: mostrar SOMENTE a foto atual das bebidas.
//    Não mostrar: nome, CPF, telefone, produtos em texto, histórico, etc.
// 6. Se estiver incorreto: mostrar somente "Dados não encontrados ou incorretos."
//    Não informar qual campo está errado.
// 7. LIMITE DE TENTATIVAS: Máximo 5 tentativas inválidas. Após 5 erros: bloquear por 30 minutos.
//    Bloqueio controlado no backend (F5 não reseta). Após 30 minutos, liberar automaticamente.
// 8. Após uma consulta válida, zerar o contador de erros daquela sessão/origem.
// 9. Não expor CPF em URL, query string ou logs públicos.
app.post('/api/consultar-bebidas', async (req: Request, res: Response): Promise<void> => {
  try {
    const clientIp = (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket.remoteAddress ||
      'anonymous-client'
    ).trim();

    const now = Date.now();
    let record = attemptStore.get(clientIp);

    if (!record) {
      record = { failedAttempts: 0, lockedUntil: null };
      attemptStore.set(clientIp, record);
    }

    // Checagem de bloqueio por tentativas excessivas (30 minutos)
    if (record.lockedUntil) {
      if (now < record.lockedUntil) {
        const remainingMinutes = Math.ceil((record.lockedUntil - now) / 60000);
        res.status(429).json({
          error: 'blocked',
          message: 'Limite de 5 tentativas excedido. Bloqueado por 30 minutos.',
          remainingMinutes,
        });
        return;
      } else {
        // Bloqueio de 30 minutos expirado -> libera automaticamente
        record.failedAttempts = 0;
        record.lockedUntil = null;
        attemptStore.set(clientIp, record);
      }
    }

    const { cpf, last4, phoneLast4 } = req.body || {};
    const inputLast4 = normalizeDigits(last4 || phoneLast4 || '');
    const cleanCpf = normalizeDigits(cpf);

    // Validação matemática do algoritmo do CPF e conferência de 4 dígitos
    const isValidCpf = cleanCpf && validateCpfAlgorithm(cleanCpf);
    const isValidLast4 = inputLast4 && inputLast4.length === 4;

    if (!isValidCpf || !isValidLast4) {
      record.failedAttempts += 1;
      if (record.failedAttempts >= MAX_FAILED_ATTEMPTS) {
        record.lockedUntil = now + LOCKOUT_MS;
      }
      attemptStore.set(clientIp, record);

      res.status(404).json({
        error: 'not_found',
        message: 'Dados não encontrados ou incorretos.',
        failedAttempts: record.failedAttempts,
        locked: record.failedAttempts >= MAX_FAILED_ATTEMPTS,
      });
      return;
    }

    // Busca cliente que coincida CPF + ÚLTIMOS 4 DÍGITOS do telefone
    const clients = loadClients();
    const matchedClient = clients.find(
      (c) => c.cpfNormalized === cleanCpf && c.phoneLast4 === inputLast4
    );

    let beveragePhoto: string | null = matchedClient?.beveragePhotoUrl || null;
    let clientFirstName: string = matchedClient
      ? (matchedClient.fullName.trim().split(/\s+/)[0] || 'Cliente')
      : '';

    // Se não encontrou no JSON local, verificar se existe na base Supabase
    if (!matchedClient) {
      try {
        const { data: rpcImage } = await supabase.rpc('get_customer_beverages_by_cpf_phone', {
          p_cpf: cleanCpf,
          p_last4: inputLast4,
        });
        if (rpcImage) {
          beveragePhoto = rpcImage;
          clientFirstName = 'Cliente';
        }
      } catch {
        // RPC fallback
      }
    }

    // Se cliente NÃO foi encontrado (nem localmente nem via RPC)
    if (!matchedClient && !beveragePhoto) {
      record.failedAttempts += 1;
      if (record.failedAttempts >= MAX_FAILED_ATTEMPTS) {
        record.lockedUntil = now + LOCKOUT_MS;
      }
      attemptStore.set(clientIp, record);

      // Resposta genérica sem informar qual campo está errado
      res.status(404).json({
        error: 'not_found',
        message: 'Dados não encontrados ou incorretos.',
        failedAttempts: record.failedAttempts,
        locked: record.failedAttempts >= MAX_FAILED_ATTEMPTS,
      });
      return;
    }

    // SUCESSO:
    // Regra: Após consulta válida, zerar contador de erros daquela sessão/origem
    record.failedAttempts = 0;
    record.lockedUntil = null;
    attemptStore.set(clientIp, record);

    // Retorna primeiro nome e a foto atual das bebidas (ou null se sem foto)
    res.json({
      success: true,
      firstName: clientFirstName || 'Cliente',
      image: beveragePhoto || null,
      imageUrl: beveragePhoto || null,
    });
  } catch {
    res.status(404).json({
      error: 'not_found',
      message: 'Dados não encontrados ou incorretos.',
    });
  }
});

// ==========================================
// DEV & STATIC SERVING
// ==========================================
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Onze Lounge Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
