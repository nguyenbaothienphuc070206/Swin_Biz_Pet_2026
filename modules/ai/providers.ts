import "server-only";

export type ProviderRequest = { system: string; input: unknown; jsonSchema: Record<string, unknown>; model: string; signal: AbortSignal };
export type ProviderResponse = { json: unknown; inputTokens?: number; outputTokens?: number; model: string };
export interface AiProvider { readonly name: string; generate(request: ProviderRequest): Promise<ProviderResponse> }

async function parseResponse(response: Response) {
  if (!response.ok) throw new Error(`provider_http_${response.status}`);
  return response.json() as Promise<Record<string, any>>;
}

export class OpenAiProvider implements AiProvider {
  readonly name = "openai";
  constructor(private readonly apiKey: string, private readonly model: string) {}
  async generate(request: ProviderRequest): Promise<ProviderResponse> {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", signal: request.signal,
      headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        input: [
          { role: "developer", content: request.system },
          { role: "user", content: JSON.stringify({ untrusted_data: request.input }) },
        ],
        text: { format: { type: "json_schema", name: "pawcare_output", strict: true, schema: request.jsonSchema } },
      }),
    });
    const body = await parseResponse(response);
    const text = body.output?.flatMap((item: any) => item.content ?? []).find((item: any) => item.type === "output_text")?.text;
    if (typeof text !== "string") throw new Error("provider_empty_output");
    return { json: JSON.parse(text), model: body.model ?? this.model, inputTokens: body.usage?.input_tokens, outputTokens: body.usage?.output_tokens };
  }
}

export class AnthropicProvider implements AiProvider {
  readonly name = "anthropic";
  constructor(private readonly apiKey: string, private readonly model: string) {}
  async generate(request: ProviderRequest): Promise<ProviderResponse> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal: request.signal,
      headers: { "x-api-key": this.apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: this.model, max_tokens: 1200, system: request.system,
        messages: [{ role: "user", content: JSON.stringify({ untrusted_data: request.input }) }],
        output_config: { format: { type: "json_schema", schema: request.jsonSchema } },
      }),
    });
    const body = await parseResponse(response);
    const text = body.content?.find((item: any) => item.type === "text")?.text;
    if (typeof text !== "string") throw new Error("provider_empty_output");
    return { json: JSON.parse(text), model: body.model ?? this.model, inputTokens: body.usage?.input_tokens, outputTokens: body.usage?.output_tokens };
  }
}
