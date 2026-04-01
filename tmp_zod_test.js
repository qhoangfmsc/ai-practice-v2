const { z } = require("zod");
const zodToJsonSchema = require("zod-to-json-schema").zodToJsonSchema;
// Try to see if this library exists and what it returns
try {
  const schema = z.object({ location: z.string() });
  console.log(JSON.stringify(zodToJsonSchema(schema), null, 2));
} catch (e) {
  console.error("No zod-to-json-schema available or error:", e);
}
