/**
 * Cloudflare Worker voor delftscheopera.nl.
 *
 * De site zelf bestaat uit statische bestanden (dist/) die Cloudflare direct serveert. Deze worker
 * doet alleen wat niet statisch kan:
 * - /cms/auth en /cms/callback: inloggen in het beheer (Sveltia CMS) via GitHub (OAuth);
 * - alle andere adressen doorgeven aan de statische bestanden (onbekend = de 404-pagina).
 *
 * Het inloggen is overgenomen van Sveltia CMS Authenticator (MIT-licentie,
 * https://github.com/sveltia/sveltia-cms-auth), beperkt tot GitHub en tot deze ene site: het token
 * wordt alleen doorgegeven aan een beheervenster op hetzelfde domein.
 *
 * Instellen:
 * - GITHUB_CLIENT_ID      Client ID van de GitHub OAuth-app, in wrangler.jsonc (openbaar)
 * - GITHUB_CLIENT_SECRET  Client secret van die app, als "Secret" in Cloudflare
 *                         (Workers → delftscheopera-website → Settings → Variables and Secrets)
 * Callback-URL van de OAuth-app: https://delftscheopera.nl/cms/callback
 */

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
}

type AuthResult = { token: string } | { error: string; errorCode: string };

const CSRF_COOKIE = 'cms-csrf';
const COOKIE_ATTRIBUTES = 'HttpOnly; Path=/cms; SameSite=Lax; Secure';

/** Rechten die het beheer mag vragen; iets anders valt terug op de standaard. */
const ALLOWED_SCOPES = ['repo', 'public_repo', 'user', 'read:user', 'user:email'];
const DEFAULT_SCOPE = 'repo,user';

function scopeFor(requested: string | null): string {
  const scopes = (requested ?? '').split(/[\s,]+/).filter(Boolean);
  return scopes.length && scopes.every((scope) => ALLOWED_SCOPES.includes(scope))
    ? scopes.join(',')
    : DEFAULT_SCOPE;
}

/**
 * Pagina voor het inlogvenster (pop-up): geeft het resultaat door aan het beheer dat het venster
 * opende, volgens het protocol van Decap/Sveltia CMS. Alleen een venster op dezelfde origin krijgt
 * antwoord, zodat het token nergens anders terecht kan komen.
 */
function authResponse(result: AuthResult): Response {
  const state = 'token' in result ? 'success' : 'error';
  const message = `authorization:github:${state}:${JSON.stringify({ provider: 'github', ...result })}`;
  const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Inloggen</title></head><body><script>
    (() => {
      const message = ${JSON.stringify(message).replaceAll('<', '\\u003c')};
      window.addEventListener('message', (event) => {
        if (event.origin !== location.origin || event.data !== 'authorizing:github') return;
        window.opener?.postMessage(message, location.origin);
      });
      window.opener?.postMessage('authorizing:github', location.origin);
    })();
  </script></body></html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Set-Cookie': `${CSRF_COOKIE}=; Max-Age=0; ${COOKIE_ATTRIBUTES}`,
    },
  });
}

const misconfigured: AuthResult = {
  error: 'De GitHub-koppeling van het beheer is nog niet ingesteld.',
  errorCode: 'MISCONFIGURED_CLIENT',
};

/** Stap 1: doorsturen naar GitHub om toestemming te vragen. */
function handleAuth(url: URL, env: Env): Response {
  const provider = url.searchParams.get('provider');
  if (provider !== 'github') {
    return authResponse({
      error: 'Alleen inloggen via GitHub wordt ondersteund.',
      errorCode: 'UNSUPPORTED_BACKEND',
    });
  }
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) return authResponse(misconfigured);

  // Willekeurige code tegen CSRF: moet bij terugkomst van GitHub gelijk zijn aan de cookie.
  const state = crypto.randomUUID().replaceAll('-', '');
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    scope: scopeFor(url.searchParams.get('scope')),
    state,
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: `https://github.com/login/oauth/authorize?${params}`,
      'Cache-Control': 'no-store',
      'Set-Cookie': `${CSRF_COOKIE}=${state}; Max-Age=600; ${COOKIE_ATTRIBUTES}`,
    },
  });
}

/** Stap 2: GitHub stuurt de gebruiker terug met een code; die wisselen we in voor een token. */
async function handleCallback(request: Request, url: URL, env: Env): Promise<Response> {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookie = request.headers
    .get('Cookie')
    ?.match(new RegExp(`(?:^|;\\s*)${CSRF_COOKIE}=([0-9a-f]{32})`))?.[1];

  if (!code || !state) {
    return authResponse({
      error: 'Geen code ontvangen van GitHub. Probeer het opnieuw.',
      errorCode: 'AUTH_CODE_REQUEST_FAILED',
    });
  }
  if (!cookie || cookie !== state) {
    return authResponse({
      error: 'De inlogpoging is verlopen of ongeldig. Probeer het opnieuw.',
      errorCode: 'CSRF_DETECTED',
    });
  }
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) return authResponse(misconfigured);

  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
      }),
    });
    const data = (await response.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };
    if (data.access_token) return authResponse({ token: data.access_token });
    return authResponse({
      error: data.error_description ?? data.error ?? 'Onbekende fout bij GitHub.',
      errorCode: 'TOKEN_REQUEST_FAILED',
    });
  } catch {
    return authResponse({
      error: 'GitHub is niet bereikbaar. Probeer het later opnieuw.',
      errorCode: 'TOKEN_REQUEST_FAILED',
    });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/cms/auth') return handleAuth(url, env);
    if (request.method === 'GET' && url.pathname === '/cms/callback')
      return handleCallback(request, url, env);
    return env.ASSETS.fetch(request);
  },
};
