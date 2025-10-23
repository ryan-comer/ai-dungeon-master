import { Schema, Type } from '@google/genai';

// Lean schema: only request name and description from the model
export const SettingSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    description: { type: Type.STRING },
  },
  required: ['name', 'description'],
};
