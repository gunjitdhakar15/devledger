const TOKEN_KEY = "auth_token";
const MODE_KEY = "devledger_mode";

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(MODE_KEY, "live");
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
}

export function isDemoMode(): boolean {
  return localStorage.getItem(MODE_KEY) === "demo";
}

export function setDemoMode(enabled: boolean): void {
  if (enabled) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.setItem(MODE_KEY, "demo");
    return;
  }

  localStorage.setItem(MODE_KEY, "live");
}

export function hasSession(): boolean {
  return Boolean(getAuthToken()) || isDemoMode();
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(MODE_KEY);
}
