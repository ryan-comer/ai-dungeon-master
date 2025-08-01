import { Schema, Type } from '@google/genai';

/**
 * Schema definition for Encounter structured output with Google GenAI.
 */
export const EncounterSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    description: { type: Type.STRING },
    battlemapPrompt: { type: Type.STRING },
    backgroundImageDimension: { type: Type.STRING },
    entities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          tokenPrompt: { type: Type.STRING },
          count: { type: Type.NUMBER },
          level: { type: Type.NUMBER },
          alignment: { type: Type.STRING },
          abilities: {
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
          armorClass: { type: Type.NUMBER },
          hitPoints: { type: Type.NUMBER },
          movement: {
            type: Type.OBJECT,
            properties: {
              burrow: { type: Type.NUMBER },
              climb: { type: Type.NUMBER },
              fly: { type: Type.NUMBER },
              hover: { type: Type.BOOLEAN },
              swim: { type: Type.NUMBER },
              walk: { type: Type.NUMBER }
            },
            required: ['burrow', 'climb', 'fly', 'hover', 'swim', 'walk']
          },
          weapons: {
            type: Type.ARRAY,
            items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, effect: { type: Type.STRING }, imagePrompt: { type: Type.STRING } }, required: ['name', 'description', 'effect', 'imagePrompt'] }
          },
          equipment: {
            type: Type.ARRAY,
            items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, effect: { type: Type.STRING }, imagePrompt: { type: Type.STRING } }, required: ['name', 'description', 'effect', 'imagePrompt'] }
          },
          spells: {
            type: Type.ARRAY,
            items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, effect: { type: Type.STRING }, imagePrompt: { type: Type.STRING } }, required: ['name', 'description', 'effect', 'imagePrompt'] }
          },
          features: {
            type: Type.ARRAY,
            items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, effect: { type: Type.STRING }, imagePrompt: { type: Type.STRING } }, required: ['name', 'description', 'effect', 'imagePrompt'] }
          },
          cr: { type: Type.NUMBER },
          size: { type: Type.STRING }
        },
        required: ['name', 'description', 'tokenPrompt', 'count', 'level', 'alignment', 'abilities', 'armorClass', 'hitPoints', 'movement', 'weapons', 'equipment', 'spells', 'features', 'cr', 'size']
      }
    }
  },
  required: ['name', 'description', 'battlemapPrompt', 'backgroundImageDimension', 'entities']
};
