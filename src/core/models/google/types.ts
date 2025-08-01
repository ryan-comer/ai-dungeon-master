// Re-exporting Type enum from Google GenAI for structured output definitions
import { Type } from '@google/genai';

/**
 * Use this enum to specify JSON Schema types in Google GenAI structured output.
 * Example:
 *   const schema = { type: Type.OBJECT, properties: { ... } };
 */
export { Type };
