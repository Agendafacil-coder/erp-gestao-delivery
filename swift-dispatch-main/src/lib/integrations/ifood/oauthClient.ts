const IFOOD_AUTH_BASE = "https://merchant-api.ifood.com.br/authentication/v1.0/oauth";

export type IfoodTokenResponse = {
  accessToken: string;
  refreshToken?: string | null;
  expiresIn: number;
  type?: string;
};

export type IfoodUserCodeResponse = {
  userCode: string;
  authorizationCodeVerifier: string;
  verificationUrlComplete: string;
  expiresIn: number;
};

async function postForm<T>(path: string, params: Record<string, string>): Promise<T> {
  const body = new URLSearchParams(params);
  const res = await fetch(`${IFOOD_AUTH_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`iFood OAuth: ${text.slice(0, 300)}`);
  }

  return JSON.parse(text) as T;
}

function normalizeToken(raw: Record<string, unknown>): IfoodTokenResponse {
  return {
    accessToken: String(raw.accessToken ?? raw.access_token ?? ""),
    refreshToken: (raw.refreshToken ?? raw.refresh_token ?? null) as string | null,
    expiresIn: Number(raw.expiresIn ?? raw.expires_in ?? 21600),
    type: String(raw.type ?? "Bearer"),
  };
}

/** App centralizado — client_credentials */
export async function fetchClientCredentialsToken(
  clientId: string,
  clientSecret: string,
): Promise<IfoodTokenResponse> {
  const raw = await postForm<Record<string, unknown>>("/token", {
    grantType: "client_credentials",
    clientId,
    clientSecret,
  });
  return normalizeToken(raw);
}

/** App distribuído — passo 1: código para o lojista autorizar no Portal iFood */
export async function fetchUserCode(clientId: string): Promise<IfoodUserCodeResponse> {
  const raw = await postForm<Record<string, unknown>>("/userCode", { clientId });
  return {
    userCode: String(raw.userCode ?? raw.user_code ?? ""),
    authorizationCodeVerifier: String(
      raw.authorizationCodeVerifier ?? raw.authorization_code_verifier ?? "",
    ),
    verificationUrlComplete: String(
      raw.verificationUrlComplete ?? raw.verification_url_complete ?? "",
    ),
    expiresIn: Number(raw.expiresIn ?? raw.expires_in ?? 600),
  };
}

/** App distribuído — passo 2: trocar authorizationCode por tokens */
export async function exchangeAuthorizationCode(input: {
  clientId: string;
  clientSecret: string;
  authorizationCode: string;
  authorizationCodeVerifier: string;
}): Promise<IfoodTokenResponse> {
  const raw = await postForm<Record<string, unknown>>("/token", {
    grantType: "authorization_code",
    clientId: input.clientId,
    clientSecret: input.clientSecret,
    authorizationCode: input.authorizationCode,
    authorizationCodeVerifier: input.authorizationCodeVerifier,
  });
  return normalizeToken(raw);
}

/** Renovar access token com refresh_token */
export async function refreshAccessToken(input: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<IfoodTokenResponse> {
  const raw = await postForm<Record<string, unknown>>("/token", {
    grantType: "refresh_token",
    clientId: input.clientId,
    clientSecret: input.clientSecret,
    refreshToken: input.refreshToken,
  });
  return normalizeToken(raw);
}
