import { Schema, Type } from '@google/genai';

/**
 * Schema definition for Storyline structured output with Google GenAI.
 */
export const StorylineSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    campaign: { type: Type.STRING },
    description: { type: Type.STRING },
    objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
    segments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          tasks: { type: Type.ARRAY, items: { type: Type.OBJECT,
            properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, objective: { type: Type.STRING } },
            required: ['name', 'description', 'objective'],
          } },
          locations: { type: Type.ARRAY, items: { type: Type.OBJECT,
            properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, features: { type: Type.STRING } },
            required: ['name', 'description', 'features'],
          } },
          characters: { type: Type.ARRAY, items: { type: Type.OBJECT,
            properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, role: { type: Type.STRING } },
            required: ['name', 'description', 'role'],
          } }
        },
        required: ['name', 'description', 'tasks', 'locations', 'characters']
      }
    },
    factions: { type: Type.ARRAY, items: { type: Type.OBJECT, 
      properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, relevance: { type: Type.STRING } },
      required: ['name', 'description', 'relevance'],
    } }
  },
  required: ['name', 'campaign', 'description', 'objectives', 'segments', 'factions'],
};
