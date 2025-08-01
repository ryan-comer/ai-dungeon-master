import { Schema, Type } from '@google/genai';

/**
 * Schema definition for Session structured output with Google GenAI.
 */
export const SessionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    chatHistory: { type: Type.ARRAY, items: { type: Type.STRING } },
    sessionIndices: { type: Type.ARRAY, items: { type: Type.NUMBER } },
  },
  required: ['name', 'chatHistory', 'sessionIndices'],
};
