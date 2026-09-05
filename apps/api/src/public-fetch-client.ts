import http from "node:http";
import type { PublicWebFetcher } from "./account-template-web-evidence.js";
export const isolatedPublicFetcher: PublicWebFetcher = async (url) => {
  if (!process.env.PUBLIC_FETCH_SOCKET) throw new Error("public_fetch_coordinator_unavailable");
  const payload = JSON.stringify({ url });
  return new Promise((resolve, reject) => {
    const request = http.request({ socketPath: process.env.PUBLIC_FETCH_SOCKET, path: "/v1/public-observation", method: "POST", headers: { "content-type": "application/json", "content-length": Buffer.byteLength(payload) } }, (response) => {
      const chunks: Buffer[] = []; let size = 0;
      if (response.statusCode !== 200) { response.resume(); reject(new Error("public_retrieval_failed")); return; }
      response.on("data", (chunk: Buffer) => { size += chunk.length; if (size > 15 * 1024 * 1024) response.destroy(new Error("public_response_too_large")); else chunks.push(chunk); });
      response.on("error", reject);
      response.on("end", () => { try { const result = JSON.parse(Buffer.concat(chunks).toString("utf8")); if (!Number.isInteger(result.status) || typeof result.content_base64 !== "string" || !result.headers || typeof result.headers !== "object") throw new Error("public_fetch_contract_invalid"); resolve({ status: result.status, headers: result.headers, body: Buffer.from(result.content_base64, "base64") }); } catch { reject(new Error("public_fetch_contract_invalid")); } });
    });
    request.setTimeout(15000, () => request.destroy(new Error("public_fetch_timeout"))); request.on("error", reject); request.end(payload);
  });
};
