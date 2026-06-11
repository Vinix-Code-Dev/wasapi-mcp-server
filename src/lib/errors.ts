export type ErrorCategory =
  | "auth"
  | "not_found"
  | "validation"
  | "rate_limit"
  | "server"
  | "network"
  | "unknown";

export interface MappedError {
  category: ErrorCategory;
  message: string;
}

interface MaybeAxios {
  isAxiosError?: boolean;
  code?: string;
  message?: string;
  response?: { status?: number; data?: any; headers?: Record<string, string> };
}

export function mapError(err: unknown): MappedError {
  const e = err as MaybeAxios;
  if (e?.isAxiosError) {
    const status = e.response?.status;
    const data = e.response?.data;
    if (status === 401 || status === 403) {
      return { category: "auth", message: "API key inválida o sin permisos para este recurso" };
    }
    if (status === 404) {
      const detail = data?.message ?? data?.error ?? "sin detalle";
      return { category: "not_found", message: `Recurso no encontrado: ${detail}` };
    }
    if (status === 422) {
      const errors = data?.errors ?? data?.message ?? "datos inválidos";
      return { category: "validation", message: `Datos inválidos: ${JSON.stringify(errors)}` };
    }
    if (status === 429) {
      const retry = e.response?.headers?.["retry-after"] ?? "?";
      return { category: "rate_limit", message: `Rate limit alcanzado. Reintentar en ${retry}s` };
    }
    if (status && status >= 500) {
      return { category: "server", message: `Error del servidor Wasapi: ${data?.message ?? e.message ?? "5xx"}. Reintentable.` };
    }
    if (!e.response) {
      return { category: "network", message: "No se pudo contactar a Wasapi" };
    }
  }
  const msg = err instanceof Error ? err.message : String(err);
  return { category: "unknown", message: msg };
}
