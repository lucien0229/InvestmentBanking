import test from "node:test";
import assert from "node:assert/strict";
import { readCompletionStream } from "../../apps/api/src/ai-source-proposals.js";

function response(text: string) {
  const bytes = new TextEncoder().encode(text);
  return new Response(
    new ReadableStream({
      start(controller) {
        for (let i = 0; i < bytes.length; i += 7)
          controller.enqueue(bytes.slice(i, i + 7));
        controller.close();
      },
    }),
  );
}
test("Workbook provider streaming preserves split Unicode, content, identity and usage", async () => {
  const messages = [
    {
      id: "provider-1",
      model: "gpt-5.6-sol",
      choices: [{ delta: { content: '{"note":"核验' } }],
    },
    { choices: [{ delta: { content: '通过"}' } }] },
    { usage: { completion_tokens: 10 }, choices: [] },
  ];
  const result = await readCompletionStream(
    response(
      messages.map((m) => "data: " + JSON.stringify(m) + "\r\n\r\n").join("") +
        "data: [DONE]\r\n\r\n",
    ),
  );
  assert.equal(result.choices?.[0]?.message?.content, '{"note":"核验通过"}');
  assert.equal(result.id, "provider-1");
  assert.equal(result.model, "gpt-5.6-sol");
  assert.deepEqual(result.usage, { completion_tokens: 10 });
});
test("Incomplete and failed provider streams cannot become accepted output", async () => {
  await assert.rejects(
    readCompletionStream(response('data: {"choices":[]}\n\n')),
    /ai_provider_incomplete_stream/,
  );
  await assert.rejects(
    readCompletionStream(
      response(
        'data: {"error":{"message":"provider private detail"}}\n\ndata: [DONE]\n\n',
      ),
    ),
    /ai_provider_stream_failed/,
  );
});
