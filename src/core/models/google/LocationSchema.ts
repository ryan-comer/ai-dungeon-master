import { Schema, Type } from '@google/genai';

/**
 * Schema definition for Location structured output with Google GenAI.
 */
export const LocationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    description: { type: Type.STRING },
    locationType: { type: Type.STRING },
    geography: {
      type: Type.OBJECT,
      properties: {
        climate: { type: Type.STRING },
        terrain: { type: Type.STRING },
        features: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ['climate', 'terrain', 'features']
    },
    population: {
      type: Type.OBJECT,
      properties: {
        size: { type: Type.STRING },
        demographics: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              percentage: { type: Type.STRING }
            },
            required: ['name', 'description', 'percentage']
          }
        }
      },
      required: ['size', 'demographics']
    },
    government: {
      type: Type.OBJECT,
      properties: {
        type: { type: Type.STRING },
        ruler: { type: Type.STRING },
        laws: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ['type', 'ruler', 'laws']
    },
    economy: {
      type: Type.OBJECT,
      properties: {
        type: { type: Type.STRING },
        resources: { type: Type.ARRAY, items: { type: Type.STRING } },
        currency: { type: Type.STRING }
      },
      required: ['type', 'resources', 'currency']
    },
    defenses: {
      type: Type.OBJECT,
      properties: {
        military: { type: Type.STRING },
        fortifications: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ['military', 'fortifications']
    },
    culture: {
      type: Type.OBJECT,
      properties: {
        religion: { type: Type.STRING },
        traditions: { type: Type.ARRAY, items: { type: Type.STRING } },
        festivals: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ['religion', 'traditions', 'festivals']
    },
    people: {
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
    campaign: {
      type: Type.OBJECT,
      properties: {
        relevance: { type: Type.STRING },
        hooks: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ['relevance', 'hooks']
    },
    history: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          date: { type: Type.STRING }
        },
        required: ['name', 'description', 'date']
      }
    },
    factions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          relevance: { type: Type.STRING }
        },
        required: ['name', 'description', 'relevance']
      }
    }
  },
  required: [
    'name', 'description', 'locationType', 'geography', 'population', 'government',
    'economy', 'defenses', 'culture', 'people', 'campaign', 'history', 'factions'
  ]
};
