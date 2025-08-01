import { Schema, Type } from '@google/genai';

/**
 * Schema definition for Character for structured output with Google GenAI.
 */
export const CharacterSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    description: { type: Type.STRING },
    campaignRole: { type: Type.STRING },
    alignment: { type: Type.STRING },
    factions: {
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
    job: { type: Type.STRING },
    physicalDescription: {
      type: Type.OBJECT,
      properties: {
        age: { type: Type.STRING },
        gender: { type: Type.STRING },
        height: { type: Type.STRING },
        build: { type: Type.STRING },
        notableFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
        attire: { type: Type.STRING }
      },
      required: ['age', 'gender', 'height', 'build', 'notableFeatures', 'attire']
    },
    personality: {
      type: Type.OBJECT,
      properties: {
        general: { type: Type.STRING },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        flaws: { type: Type.ARRAY, items: { type: Type.STRING } },
        mannerisms: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ['general', 'strengths', 'flaws', 'mannerisms']
    },
    background: {
      type: Type.OBJECT,
      properties: {
        origin: { type: Type.STRING },
        significant_events: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ['origin', 'significant_events']
    },
    goals: {
      type: Type.OBJECT,
      properties: {
        shortTerm: { type: Type.ARRAY, items: { type: Type.STRING } },
        long_term_goals: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ['shortTerm', 'long_term_goals']
    },
    fears: { type: Type.ARRAY, items: { type: Type.STRING } },
    relationships: {
      type: Type.OBJECT,
      properties: {
        allies: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              relationship: { type: Type.STRING },
              notes: { type: Type.STRING }
            },
            required: ['name', 'relationship', 'notes']
          }
        },
        enemies: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              relationship: { type: Type.STRING },
              notes: { type: Type.STRING }
            },
            required: ['name', 'relationship', 'notes']
          }
        }
      },
      required: ['allies', 'enemies']
    },
    skills: {
      type: Type.OBJECT,
      properties: {
        magic: { type: Type.ARRAY, items: { type: Type.STRING } },
        combat: { type: Type.ARRAY, items: { type: Type.STRING } },
        languages_spoken: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ['magic', 'combat', 'languages_spoken']
    },
    equipment: {
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
    wealth: { type: Type.STRING },
    campaign: {
      type: Type.OBJECT,
      properties: {
        relevance: { type: Type.STRING },
        hooks: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ['relevance', 'hooks']
    },
    achievements: { type: Type.ARRAY, items: { type: Type.STRING } },
    dialogExamples: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: [
    'name',
    'description',
    'campaignRole',
    'alignment',
    'factions',
    'job',
    'physicalDescription',
    'personality',
    'background',
    'goals',
    'fears',
    'relationships',
    'skills',
    'equipment',
    'wealth',
    'campaign',
    'achievements',
    'dialogExamples'
  ]
};
