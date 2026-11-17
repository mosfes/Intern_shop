/** One cache per mounted admin account. Nothing is persisted to browser storage. */
export class AdminViewCache {
  private values = new Map<string, unknown>();
  private listeners = new Set<() => void>();
  private requests = new Map<string, Promise<Response>>();
  private revision = 0;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  get<T>(key: string): T | null { return (this.values.get(key) as T | undefined) ?? null; }

  set<T>(key: string, update: T | null | ((current: T | null) => T | null)) {
    const next = typeof update === "function" ? (update as (current: T | null) => T | null)(this.get<T>(key)) : update;
    if (this.values.size >= 24 && !this.values.has(key)) this.values.delete(this.values.keys().next().value!);
    this.values.set(key, next);
    this.listeners.forEach((listener) => listener());
  }

  /** Keep the editor's current rows for its local update; reload dependent views next time. */
  invalidateExcept(key: string) {
    this.revision += 1;
    for (const cached of this.values.keys()) if (cached !== key) this.values.delete(cached);
    this.requests.clear();
    this.listeners.forEach((listener) => listener());
  }

  async request(key: string, url: string, init?: RequestInit): Promise<Response> {
    const method = (init?.method ?? "GET").toUpperCase();
    if (method !== "GET") {
      const response = await fetch(url, init);
      if (response.ok) this.invalidateExcept(key);
      return response;
    }
    // Each reader has its own cancellation and response body; concurrent readers share network work.
    for (;;) {
      init?.signal?.throwIfAborted();
      const revision = this.revision;
      let request = this.requests.get(url);
      if (!request) {
        request = fetch(url, { ...init, signal: undefined });
        this.requests.set(url, request);
        const pending = request;
        void request.finally(() => {
          if (this.requests.get(url) === pending) this.requests.delete(url);
        }).catch(() => {});
      }
      const response = await request;
      init?.signal?.throwIfAborted();
      if (revision === this.revision) return response.clone();
    }
  }
}
