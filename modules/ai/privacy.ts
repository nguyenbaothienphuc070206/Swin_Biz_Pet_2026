export function safeRedactedInput(input: unknown) {
  const raw=JSON.stringify(input)??"null";
  return {keys:input&&typeof input==="object"?Object.keys(input):[],byteLength:Buffer.byteLength(raw)};
}
