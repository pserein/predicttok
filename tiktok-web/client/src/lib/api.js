const BASE = import.meta.env.VITE_API_BASE || "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export const api = {
  predict: (payload) =>
    request("/predict", { method: "POST", body: JSON.stringify(payload) }),

  sweetSpot: () => request("/dashboard/sweet-spot"),
  correlations: () => request("/dashboard/correlations"),

  hashtagImpact: (base_payload, hashtags) =>
    request("/hashtags/impact", { method: "POST", body: JSON.stringify({ base_payload, hashtags }) }),
  trendingHashtags: () => request("/hashtags/trending"),

  metrics: () => request("/metrics"),
};
