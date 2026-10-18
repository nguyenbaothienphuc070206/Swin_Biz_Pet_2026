import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { AnthropicProvider, OpenAiProvider } from "./providers";

const request = { system: "Follow the schema", input: { text: "untrusted" }, jsonSchema: { type: "object" }, model: "ignored", signal: AbortSignal.timeout(1000) };
afterEach(() => vi.unstubAllGlobals());

describe("AI provider contracts", () => {
  it.each([
    ["OpenAI", OpenAiProvider, "https://api.openai.com/v1/responses", { output: [{ content: [{ type: "output_text", text: '{"ok":true}' }] }], model: "model-a", usage: { input_tokens: 4, output_tokens: 2 } }],
    ["Anthropic", AnthropicProvider, "https://api.anthropic.com/v1/messages", { content: [{ type: "text", text: '{"ok":true}' }], model: "model-b", usage: { input_tokens: 5, output_tokens: 3 } }],
  ] as const)("%s maps valid JSON responses to the common interface", async (_name, Adapter, endpoint, body) => {
    const fetchMock = vi.fn(async () => Response.json(body)); vi.stubGlobal("fetch", fetchMock);
    const adapter = new Adapter("test-key", "test-model");
    const response = await adapter.generate(request);
    expect(fetchMock).toHaveBeenCalledWith(endpoint, expect.objectContaining({ method: "POST", signal: request.signal }));
    expect(response.json).toEqual({ ok: true });
    expect(response.inputTokens).toBeGreaterThan(0);
  });
  it.each([OpenAiProvider, AnthropicProvider])( "rejects provider errors and malformed output", async (Adapter) => {
    const adapter = new Adapter("test-key", "test-model");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("failure", { status: 503 })));
    await expect(adapter.generate(request)).rejects.toThrow("provider_http_503");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ output: [], content: [] })));
    await expect(adapter.generate(request)).rejects.toThrow("provider_empty_output");
  });
});
