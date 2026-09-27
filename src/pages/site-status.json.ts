import { getSettings } from '@/lib/content';

/**
 * Of de site gelanceerd is (Instellingen → Website gelanceerd). De worker (worker/index.ts) leest dit
 * om te bepalen of delftscheopera.nl de site toont of alleen "Binnenkort online".
 */
export async function GET() {
  const { launched } = await getSettings();
  return new Response(JSON.stringify({ launched }), { headers: { 'Content-Type': 'application/json' } });
}
