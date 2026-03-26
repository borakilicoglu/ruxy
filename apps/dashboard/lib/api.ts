import {
  mockEventListResponse,
  mockHealthSummary,
  mockLatencyMetrics,
  mockMetricsOverview,
  mockProxyListResponse,
  mockSettingsResponse,
  mockSuccessRateMetrics,
} from "@/lib/mock-data";

export type HealthSummary = {
  total: number;
  healthy: number;
  degraded: number;
  unhealthy: number;
  cooling_down: number;
  disabled: number;
  unknown: number;
};

export type ProxyItem = {
  id: string;
  scheme: string;
  host: string;
  port: number;
  username: string | null;
  tags: string[];
  status: string;
  score: number;
  avg_latency_ms: number | null;
  success_rate: number | null;
  consecutive_failures: number;
  last_checked_at: string | null;
  cooldown_until: string | null;
  created_at: string;
  updated_at: string;
  request_count?: number;
};

export type ProxyListResponse = {
  items: ProxyItem[];
  total: number;
};

export type MetricsOverview = {
  total_proxies: number;
  healthy_proxies: number;
  healthy_ratio: number;
  average_latency_ms: number | null;
  selection_ready: number;
  needs_attention: number;
};

export type LatencyMetrics = {
  average_latency_ms: number | null;
  items: Array<{
    label: string;
    count: number;
  }>;
};

export type SuccessRateMetrics = {
  average_success_rate: number;
  items: Array<{
    label: string;
    count: number;
  }>;
};

export type EventItem = {
  id: string;
  level: string;
  category: string;
  actor: string;
  message: string;
  proxy_id: string | null;
  timestamp: string;
};

export type EventListResponse = {
  items: EventItem[];
  total: number;
};

export type SettingsResponse = {
  routing_strategy: string;
  pool_label: string;
  max_retries: number;
  selection_timeout_ms: number;
  health_interval_secs: number;
  cooldown_secs: number;
  timeout_ms: number;
  concurrency: number;
  failure_threshold: number;
  recovery_threshold: number;
};

export type CreateProxyPayload = {
  scheme: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  tags: string[];
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001";

async function apiFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API request failed for ${path}: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function apiWrite(path: string, init: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    let message: string | undefined;

    try {
      const parsed = JSON.parse(text) as {
        error?: {
          message?: string;
        };
      };
      message = parsed.error?.message;
    } catch {}

    throw new Error(message || text || `API request failed for ${path}: ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function getHealthSummary() {
  return apiFetch<HealthSummary>("/api/health/summary").catch(() => mockHealthSummary);
}

export function getMetricsOverview() {
  return apiFetch<MetricsOverview>("/api/metrics/overview").catch(
    () => mockMetricsOverview,
  );
}

export function getLatencyMetrics() {
  return apiFetch<LatencyMetrics>("/api/metrics/latency").catch(
    () => mockLatencyMetrics,
  );
}

export function getSuccessRateMetrics() {
  return apiFetch<SuccessRateMetrics>("/api/metrics/success-rate").catch(
    () => mockSuccessRateMetrics,
  );
}

export function getEvents() {
  return apiFetch<EventListResponse>("/api/events").catch(() => mockEventListResponse);
}

export function getSettings() {
  return apiFetch<SettingsResponse>("/api/settings").catch(() => mockSettingsResponse);
}

export async function getProxies() {
  try {
    return await apiFetch<ProxyListResponse>("/api/proxies");
  } catch {
    return mockProxyListResponse;
  }
}

export function createProxy(payload: CreateProxyPayload) {
  return apiWrite("/api/proxies", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteProxy(id: string) {
  return apiWrite(`/api/proxies/${id}`, {
    method: "DELETE",
  });
}
