export interface DeveloperSession {
  configured: boolean;
  authenticated: boolean;
  setupAllowed: boolean;
}

async function requestDeveloperApi(path: string, body?: unknown): Promise<Record<string, unknown>> {
  const response = await fetch(`/api/creator-league/developer/${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
      ? payload.error
      : "Developer Console -pyyntö epäonnistui.";
    throw new Error(message);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Developer Console palautti virheellisen vastauksen.");
  return Object.fromEntries(Object.entries(payload));
}

export async function getDeveloperSession(): Promise<DeveloperSession> {
  const payload = await requestDeveloperApi("session");
  if (!("configured" in payload) || typeof payload.configured !== "boolean" ||
    !("authenticated" in payload) || typeof payload.authenticated !== "boolean" ||
    !("setupAllowed" in payload) || typeof payload.setupAllowed !== "boolean") {
    throw new Error("Developer Console palautti virheellisen istuntotiedon.");
  }
  return { configured: payload.configured, authenticated: payload.authenticated, setupAllowed: payload.setupAllowed };
}

export async function setupDeveloper(email: string, password: string): Promise<void> {
  const payload = await requestDeveloperApi("setup", { email, password });
  if (!("authenticated" in payload) || payload.authenticated !== true) {
    throw new Error("Developer Console -tunnusten luonnin vahvistus epäonnistui.");
  }
}

export async function resetDeveloper(email: string, password: string): Promise<void> {
  const payload = await requestDeveloperApi("reset", { email, password });
  if (!("authenticated" in payload) || payload.authenticated !== true) {
    throw new Error("Developer Console -tunnusten luonnin vahvistus epäonnistui.");
  }
}

export async function changeDeveloperCredentials(email: string, password: string): Promise<void> {
  const payload = await requestDeveloperApi("change", { email, password });
  if (!("authenticated" in payload) || payload.authenticated !== true) {
    throw new Error("Developer Console -tunnusten vaihdon vahvistus epäonnistui.");
  }
}

export async function loginDeveloper(email: string, password: string): Promise<void> {
  const payload = await requestDeveloperApi("login", { email, password });
  if (!("authenticated" in payload) || payload.authenticated !== true) {
    throw new Error("Developer Console -kirjautumisen vahvistus epäonnistui.");
  }
}

export async function logoutDeveloper(): Promise<void> {
  const payload = await requestDeveloperApi("logout", {});
  if (!("authenticated" in payload) || payload.authenticated !== false) {
    throw new Error("Developer Console -uloskirjautumisen vahvistus epäonnistui.");
  }
}
