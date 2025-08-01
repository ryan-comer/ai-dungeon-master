import { Schema, Type } from '@google/genai';

/**
 * Schema definition for Faction structured output with Google GenAI.
 */
export const FactionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    description: { type: Type.STRING },
    alignment: { type: Type.STRING },
    goals: { type: Type.ARRAY, items: { type: Type.STRING } },
    philosophy: { type: Type.STRING },
    history: {
      type: Type.OBJECT,
      properties: {
        founded: { type: Type.STRING },
        founder: { type: Type.STRING },
        origin: { type: Type.STRING }
      },
      required: ['founded', 'founder', 'origin']
    },
    members: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          role: { type: Type.STRING },
          description: { type: Type.STRING }
        },
        required: ['name', 'role', 'description']
      }
    },
    allies: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          relationship: { type: Type.STRING }
        },
        required: ['name', 'relationship']
      }
    },
    enemies: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          relationship: { type: Type.STRING }
        },
        required: ['name', 'relationship']
      }
    },
    assets: {
      type: Type.OBJECT,
      properties: {
        bases: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              location: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ['name', 'location', 'description']
          }
        },
        artifacts: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ['name', 'description']
          }
        }
      },
      required: ['bases', 'artifacts']
    },
    operations: { type: Type.ARRAY, items: { type: Type.STRING } },
    achievements: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING }
        },
        required: ['name', 'description']
      }
    },
    publicPerception: { type: Type.STRING },
    campaign: {
      type: Type.OBJECT,
      properties: {
        relevance: { type: Type.STRING },
        hooks: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ['relevance', 'hooks']
    }
  },
  required: [
    'name', 'description', 'alignment', 'goals', 'philosophy', 'history', 'members', 'allies', 'enemies',
    'assets', 'operations', 'achievements', 'publicPerception', 'campaign'
  ]
};
