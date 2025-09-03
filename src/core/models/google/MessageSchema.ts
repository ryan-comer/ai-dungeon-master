import { Schema, Type } from '@google/genai';

/**
 * JSON schema for array of chat messages
 */
export const MessageSchema: Schema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            speaker: { type: Type.STRING },
            message: { type: Type.STRING }
        },
        required: ['speaker', 'message']
    }
};
