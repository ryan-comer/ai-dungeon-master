import { ITextToSpeechClient } from "./interfaces/ITextToSpeechClient";

class DiscordSpeechClient implements ITextToSpeechClient {

    private URL: string;

    constructor(url: string = "http://localhost:3000") {
        this.URL = url;
    }

    async speak(text: string): Promise<void> {
        try {
            await fetch(`${this.URL}/speak`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ text }),
            })
        } catch (error) {
            console.error("Error sending text to Discord speech client:", error);
        }
    }
}

export { DiscordSpeechClient };