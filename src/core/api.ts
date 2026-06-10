import { throttle } from "./rateLimiter.js";

const BASE_URL = "https://www.interago.com.br/App/Api/index.php";

export interface ApiContext {
  projectId: string;
  apiToken: string;
}

export async function apiCall(
  ctx: ApiContext,
  params: Record<string, string>
): Promise<any> {
  await throttle();
  const body = new URLSearchParams({ websiteId: ctx.projectId, ...params });
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${ctx.apiToken}`,
      Accept: "application/json",
    },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.status === "error")
    throw new Error(`${json.code}: ${json.message}`);
  return json;
}
