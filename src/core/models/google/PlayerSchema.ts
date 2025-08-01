import { Schema, Type } from '@google/genai';

/**
 * Schema definition for Player structured output with Google GenAI.
 */
export const PlayerSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    level: { type: Type.NUMBER },
    attributes: {
      type: Type.OBJECT,
      properties: {
        strength: { type: Type.NUMBER },
        dexterity: { type: Type.NUMBER },
        constitution: { type: Type.NUMBER },
        intelligence: { type: Type.NUMBER },
        wisdom: { type: Type.NUMBER },
        charisma: { type: Type.NUMBER }
      },
      required: ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']
    },
    details: {
      type: Type.OBJECT,
      properties: {
        biography: { type: Type.STRING },
        ideals: { type: Type.STRING },
        bonds: { type: Type.STRING },
        flaws: { type: Type.STRING },
        personalityTraits: { type: Type.STRING },
        appearance: { type: Type.STRING }
      },
      required: ['biography', 'ideals', 'bonds', 'flaws', 'personalityTraits', 'appearance']
    },
    ac: { type: Type.NUMBER },
    hp: { type: Type.NUMBER }
  },
  required: ['name', 'level', 'attributes', 'details', 'ac', 'hp']
};
