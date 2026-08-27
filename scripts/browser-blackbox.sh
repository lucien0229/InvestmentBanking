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
    const button = [...document.querySelectorAll("button")].find((candidate) => candidate.textContent?.includes(label));
    if (!button) throw new Error(`missing button: ${label}`);
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 450));
  };
  await click("Send Magic Link");
  await click("Verify mailbox");
  await click("Register mandatory Passkey");
  await click("Sign in with Passkey");
  await new Promise((resolve) => setTimeout(resolve, 450));
  const cross = await fetch("/api/v1/deals/00000000-0000-4000-8000-000000000202/overview");
  const absent = await fetch("/api/v1/deals/00000000-0000-4000-8000-000000000404/overview");
  return { url: location.href, page_has_reference_deal: document.body.innerText.includes("Project Northstar"), cross_status: cross.status, absent_status: absent.status, cross_type: cross.headers.get("content-type"), absent_type: absent.headers.get("content-type") };
}')
echo "$flow_result"
grep -q '"page_has_reference_deal": true' <<<"$flow_result"
grep -q '"cross_status": 404' <<<"$flow_result"
grep -q '"absent_status": 404' <<<"$flow_result"
grep -q 'application/problem+json' <<<"$flow_result"
echo "browser black-box: ok"
