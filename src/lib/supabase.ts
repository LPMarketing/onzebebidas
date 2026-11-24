import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (import.meta as any).env?.VITE_SUPABASE_URL || 'https://qxuzpeqsejcyhvzxoict.supabase.co';
const supabasePublishableKey =
  (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_Fphgp3vWPTeVt29jqhzg4g_0qXEPC_l';

if (!supabaseUrl || !supabasePublishableKey) {
  console.error('[Supabase Config Error] Supabase URL ou Publishable Key ausente.');
}

const normalizedBaseUrl = supabaseUrl.replace(/\/+$/, '');

const resilientSupabaseFetch: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init);
  } catch (directError) {
    if (typeof window === 'undefined') {
      throw directError;
    }

    const rawUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (rawUrl.startsWith(normalizedBaseUrl)) {
      const suffix = rawUrl.slice(normalizedBaseUrl.length);
      const proxyUrl = `${window.location.origin}/api/supabase${suffix}`;

      try {
        const proxyInput =
          input instanceof Request ? new Request(proxyUrl, input) : proxyUrl;
        const proxyRes = await fetch(proxyInput, init);
        if (proxyRes.headers.get('x-supabase-proxy') === '1') {
          return proxyRes;
        }
      } catch {
        // Proxy not available on static hosts (e.g. Vercel)
      }
    }

    throw directError;
  }
};

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: resilientSupabaseFetch,
  },
});
