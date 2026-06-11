// tests/integration/smoke.test.ts
// Opt-in integration smoke test against real Wasapi.
// Run with: WASAPI_TEST_API_KEY=xxx npm run test:integration
import { describe, it, expect, beforeEach } from "vitest";
import { listContactsTool } from "../../src/tools/contacts/list.js";
import { wrapHandler } from "../../src/lib/register-tool.js";
import { __resetClientForTests } from "../../src/wasapi.js";

const RUN = !!process.env.WASAPI_TEST_API_KEY;

describe.skipIf(!RUN)("integration smoke", () => {
  beforeEach(() => {
    // Reset singleton so it picks up the test API key
    __resetClientForTests();
    process.env.WASAPI_API_KEY = process.env.WASAPI_TEST_API_KEY!;
  });

  it("can list contacts against real Wasapi (getSearch under the hood)", async () => {
    const h = wrapHandler(listContactsTool.schema, listContactsTool.handler);
    // list_contacts schema accepts: page, search, labels (all optional)
    const res = await h({ page: 1 });
    expect(res.isError).toBeFalsy();
    const body = JSON.parse(res.content[0].text);
    // Real API returns an object with data array
    expect(body).toBeDefined();
  }, 15_000);
});
