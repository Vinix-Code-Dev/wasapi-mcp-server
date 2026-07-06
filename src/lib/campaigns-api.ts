// src/lib/campaigns-api.ts
// Isolated transport for the campaign endpoints not implemented by @wasapi/js-sdk
// (the SDK's campaigns.create/update/delete are stubs that throw). We reuse the
// SDK's configured AxiosClient via getClient().getClient(), so baseURL + Bearer
// auth work in both stdio and serve (per-user OAuth) modes without duplication.
//
// Kept as a thin, well-bounded module so it can later move into the SDK.

import { getClient } from "../wasapi.js";

function http() {
  // WasapiClient.getClient() returns the AxiosClient (public: get/post/put/delete).
  return getClient().getClient() as {
    get: (url: string, config?: unknown) => Promise<{ data: unknown }>;
    post: (url: string, data?: unknown, config?: unknown) => Promise<{ data: unknown }>;
  };
}

export type RecipientType = "phones" | "contact_ids" | "labels" | "all";

export interface CreateCampaignPayload {
  name: string;
  description?: string;
  template_uuid: string;
  phone_id: number;
  recipients: {
    type: RecipientType;
    values?: Array<string | number>;
  };
  variables?: {
    body?: string[];
    header?: string;
    buttons?: string[];
  };
  media?: {
    type: "image" | "video" | "document";
    url: string;
    filename?: string;
  };
  scheduled_at?: string;
  conversation_status?: "unchanged" | "open" | "closed" | "hold";
  disable_chatbot?: boolean;
}

/** POST /campaigns — create and queue a campaign. */
export async function createCampaign(payload: CreateCampaignPayload): Promise<unknown> {
  const { data } = await http().post("/campaigns", payload);
  return data;
}

/** GET /campaigns/{uuid}/stats — aggregated delivery counts by status. */
export async function getCampaignStats(uuid: string): Promise<unknown> {
  const { data } = await http().get(`/campaigns/${uuid}/stats`);
  return data;
}

/** GET /campaigns/{uuid}/logs — per-contact delivery log (cursor-paginated). */
export async function getCampaignLogs(
  uuid: string,
  cursor?: string,
  perPage?: number,
): Promise<unknown> {
  const params: Record<string, string | number> = {};
  if (cursor !== undefined) params.cursor = cursor;
  if (perPage !== undefined) params.per_page = perPage;
  const { data } = await http().get(`/campaigns/${uuid}/logs`, { params });
  return data;
}

/** POST /campaigns/{uuid}/cancel — cancel a scheduled campaign (tenant-scoped). */
export async function cancelCampaign(uuid: string): Promise<unknown> {
  const { data } = await http().post(`/campaigns/${uuid}/cancel`, {});
  return data;
}
