import fs from "node:fs";
import { z } from "zod";
import {
  workbookCommentaryPayload,
  deliverableQcPayload,
  nativeReaderParityPayload,
} from "../packages/ai-contracts/src/index.js";
const tasks = {
  workbook_commentary_draft: workbookCommentaryPayload,
  deliverable_semantic_qc: deliverableQcPayload,
  native_reader_semantic_parity_review: nativeReaderParityPayload,
};
for (const [task, schema] of Object.entries(tasks)) {
  const path = `ai-contracts/tasks/${task}`;
  fs.mkdirSync(path, { recursive: true });
  const output = JSON.parse(
    fs.readFileSync(
      "ai-contracts/tasks/valuation_commentary_draft/output.schema.json",
      "utf8",
    ),
  );
  output.$id = `https://investment-banking.local/ai/tasks/${task}/output/1.0.0`;
  output.properties.task_definition.const = task;
  output.$defs.payload = z.toJSONSchema(schema);
  delete output.$defs.payload.$schema;
  fs.writeFileSync(
    `${path}/output.schema.json`,
    JSON.stringify(output, null, 2) + "\n",
  );
  const input = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `https://investment-banking.local/ai/tasks/${task}/input/1.0.0`,
    $ref: "https://investment-banking.local/ai/input/1.0.0",
  };
  fs.writeFileSync(
    `${path}/input.schema.json`,
    JSON.stringify(input, null, 2) + "\n",
  );
}
