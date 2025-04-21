interface ITextToSpeechClient {
    speak(text: string): Promise<void>;
}

export { ITextToSpeechClient };