#!/usr/bin/env bash
set -euo pipefail

PWCLI="/Users/wxm/.codex/skills/playwright/scripts/playwright_cli.sh"
TMP_DIR="$(mktemp -d)"
cleanup() {
  kill "${WEB_PID:-}" "${API_PID:-}" 2>/dev/null || true
  "$PWCLI" close-all >/dev/null 2>&1 || true
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

npm run db:migrate >"$TMP_DIR/migrate.log"
npm run db:seed >"$TMP_DIR/seed.log"
APP_ENV=test AUTH_ADAPTER=local npm run dev:api >"$TMP_DIR/api.log" 2>&1 & API_PID=$!
API_ORIGIN=http://127.0.0.1:3001 npm run dev:web >"$TMP_DIR/web.log" 2>&1 & WEB_PID=$!

for _ in $(seq 1 60); do
  api_status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/v1/session || true)"
  if [[ "$api_status" == "200" || "$api_status" == "401" ]] && curl -fsS http://127.0.0.1:3000/account-access >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

"$PWCLI" close-all >/dev/null 2>&1 || true
"$PWCLI" open http://127.0.0.1:3000/account-access >/dev/null
flow_result=$("$PWCLI" eval 'async () => {
  const click = async (label) => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const button = [...document.querySelectorAll("button")].find((candidate) => candidate.textContent?.includes(label));
      if (button) {
        button.click();
        await new Promise((resolve) => setTimeout(resolve, 450));
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`missing button: ${label}`);
  };
  await click("Send Magic Link");
  await click("Verify mailbox");
  await click("Register mandatory Passkey");
  await click("Sign in with Passkey");
  for (let attempt = 0; attempt < 40 && !document.body.innerText.includes("Project Northstar"); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  await click("Start reference operation");
  let jobLink;
  for (let attempt = 0; attempt < 20 && !jobLink; attempt += 1) {
    jobLink = [...document.querySelectorAll("a")].find((candidate) => candidate.textContent?.includes("Open durable Job detail"));
    if (!jobLink) await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!jobLink) throw new Error("missing durable Job detail link");
  return { url: location.href, page_has_reference_deal: document.body.innerText.includes("Project Northstar"), job_href: jobLink.href };
}')
echo "$flow_result"
job_href="$(grep -o '"job_href": "[^"]*"' <<<"$flow_result" | sed 's/"job_href": "//; s/"$//' | head -n 1)"
if [[ -z "$job_href" ]]; then
  echo "missing job href" >&2
  exit 1
fi
"$PWCLI" goto "$job_href" >/dev/null
job_result=$("$PWCLI" eval 'async () => {
  for (let attempt = 0; attempt < 40 && !document.body.innerText.includes("Exact Job Scope"); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const job_detail_has_scope = document.body.innerText.includes("Exact Job Scope");
  const job_detail_has_inputs = document.body.innerText.includes("Accepted inputs");
  const job_detail_has_terminal_state = /completed|failed_retryable|failed_terminal|canceled|blocked/.test(document.body.innerText);
  const cross = await fetch("/api/v1/deals/00000000-0000-4000-8000-000000000202/overview");
  const absent = await fetch("/api/v1/deals/00000000-0000-4000-8000-000000000404/overview");
  return { url: location.href, job_detail_has_scope, job_detail_has_inputs, job_detail_has_terminal_state, cross_status: cross.status, absent_status: absent.status, cross_type: cross.headers.get("content-type"), absent_type: absent.headers.get("content-type") };
}')
grep -q '"page_has_reference_deal": true' <<<"$flow_result"
echo "$job_result"
grep -q '"job_detail_has_scope": true' <<<"$job_result"
grep -q '"job_detail_has_inputs": true' <<<"$job_result"
grep -q '"job_detail_has_terminal_state": true' <<<"$job_result"
grep -q '"cross_status": 404' <<<"$job_result"
grep -q '"absent_status": 404' <<<"$job_result"
grep -q 'application/problem+json' <<<"$job_result"
echo "browser black-box: ok"
