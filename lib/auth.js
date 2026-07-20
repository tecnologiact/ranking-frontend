const TOKEN_KEY = "ranking_auth_token";

export function getToken() {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) return stored;
  }
  return process.env.NEXT_PUBLIC_DEV_TOKEN || "dev-mock-token-123";
}

export function setToken(token) {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function isAuthenticated() {
  return Boolean(getToken());
}
