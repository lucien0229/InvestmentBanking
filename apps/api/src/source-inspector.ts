import http from "node:http";
import { z } from "zod";

const report = z.object({
  clean: z.boolean(), code: z.string().nullable(), family: z.string().optional(),
  limitations: z.array(z.string()), parser_identity: z.string().optional(), coverage_code: z.string().optional(),
  substantive_parsing: z.boolean().optional(), original_sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  container_digest: z.string(), scan: z.object({ engine: z.string(), signature_updated_at: z.number() }).optional(),
  fragments: z.array(z.object({ locator: z.record(z.string(), z.unknown()), content_text: z.string().min(1).max(200000), content_sha256: z.string().regex(/^sha256:[a-f0-9]{64}$/), coverage_code: z.string() })).max(10000),
});
export type SourceInspection = z.infer<typeof report>;
export async function inspectSource(bytes: Buffer, family: string, mode: "scan" | "parse"): Promise<SourceInspection> {
  const socketPath = process.env.SOURCE_INSPECTOR_SOCKET ?? process.env.OFFICE_RENDERER_SOCKET;
  if (!socketPath) throw new Error("source_inspector_unavailable");
  const payload = JSON.stringify({ operation: "inspect_source", input: { family, mode }, source: bytes.toString("base64") });
  return new Promise((resolve, reject) => {
    const request = http.request({ socketPath, path: "/v1/source", method: "POST", headers: { "content-type": "application/json", "content-length": Buffer.byteLength(payload) } }, (response) => {
      const chunks: Buffer[] = []; let received = 0;
      if (response.statusCode !== 200) { response.resume(); reject(new Error(response.statusCode === 429 ? "source_inspector_busy" : "source_inspection_failed")); return; }
      response.on("data", (chunk: Buffer) => { received += chunk.length; if (received > 16 * 1024 * 1024) response.destroy(new Error("source_inspection_output_limit")); else chunks.push(chunk); });
      response.on("error", reject);
      response.on("end", () => { try { resolve(report.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")))); } catch { reject(new Error("source_inspection_contract_invalid")); } });
    });
    request.setTimeout(190000, () => request.destroy(new Error("source_inspection_timeout")));
    request.on("error", reject); request.end(payload);
  });
}
