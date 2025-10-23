import { Schema, Type } from '@google/genai';

// Lean schema: only request name and description from the model
export const CampaignSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    description: { type: Type.STRING },
  },
  required: ['name', 'description']
};
