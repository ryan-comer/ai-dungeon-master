/**
 * Represents a single chat message with speaker identification.
 */
export interface ChatMessage {
    /** Speaker name, e.g. 'Narrator' or character name */
    speaker: string;
    /** Message content */
    message: string;
}
