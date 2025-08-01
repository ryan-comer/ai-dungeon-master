import { Schema, Type } from '@google/genai';

/**
 * Schema definition for Campaign for structured output with Google GenAI.
 */
export const CampaignSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    setting: { type: Type.STRING },
    description: { type: Type.STRING },
    objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
    overview: {
      type: Type.OBJECT,
      properties: {
        description: { type: Type.STRING },
        objective: { type: Type.STRING },
        premise: { type: Type.STRING }
      },
      required: ['description', 'objective', 'premise']
    },
    factions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          motivation: { type: Type.STRING }
        },
        required: ['name', 'description', 'motivation']
      }
    },
    characters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          role: { type: Type.STRING }
        },
        required: ['name', 'description', 'role']
      }
    },
    locations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          features: { type: Type.STRING },
          relevance: { type: Type.STRING }
        },
        required: ['name', 'description', 'features', 'relevance']
      }
    },
    milestones: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          objective: { type: Type.STRING }
        },
        required: ['name', 'description', 'objective']
      }
    }
  },
  required: [
    'name',
    'setting',
    'description',
    'objectives',
    'overview',
    'factions',
    'characters',
    'locations',
    'milestones'
  ]
};
