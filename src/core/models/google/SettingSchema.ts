import { Schema, Type } from '@google/genai';

/**
 * Schema definition for Setting structured output with Google GenAI.
 */
export const SettingSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    description: { type: Type.STRING },
    geography: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          features: { type: Type.STRING },
          settlements: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                population: { type: Type.STRING },
                knownFor: { type: Type.STRING },
              },
              required: ['name', 'description', 'population', 'knownFor'],
            }
          }
        },
        required: ['name', 'description', 'features', 'settlements'],
      }
    },
    factions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          alignment: { type: Type.STRING },
          goals: { type: Type.STRING },
          members: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                role: { type: Type.STRING },
                description: { type: Type.STRING },
              },
              required: ['name', 'role', 'description'],
            }
          }
        },
        required: ['name', 'description', 'alignment', 'goals', 'members'],
      }
    },
    notableFigures: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          role: { type: Type.STRING },
        },
        required: ['name', 'description', 'role'],
      }
    },
    historicalEvents: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          date: { type: Type.STRING },
        },
        required: ['name', 'description', 'date'],
      }
    },
    deities: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ['name', 'description'],
      }
    },
    monsters: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          habitat: { type: Type.STRING },
        },
        required: ['name', 'description', 'habitat'],
      }
    },
    conflicts: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          parties: {
            type: Type.ARRAY,
            items: { type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
              },
              required: ['name', 'description'],
            }
          }
        },
        required: ['name', 'description', 'parties'],
      }
    }
  },
  required: ['name', 'description', 'geography', 'factions', 'notableFigures', 'historicalEvents', 'deities', 'monsters', 'conflicts'],
};
