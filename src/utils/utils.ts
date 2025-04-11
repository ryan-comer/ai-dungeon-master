function stripInvalidFilenameChars(name: string): string {
    return name.replace(/[^a-z0-9]/gi, "_");
}

// Send a chat message to the chat window
function sendChatMessage(message: string): void {
    ChatMessage.create({ content: message });
}

import { removeBackground } from "@imgly/background-removal";
async function removeWhiteBackground(base64Image: string): Promise<string> {
    try {
        const blob = await removeBackground({
            image: base64Image,
            color: { r: 255, g: 255, b: 255 }, // White background color
        });

        if (!blob) {
            throw new Error("removeBackground returned undefined or null");
        }

        const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        return base64;
    } catch (error) {
        console.error("Error in removeWhiteBackground:", error);
        throw error; // Re-throw the error after logging
    }
}

export { stripInvalidFilenameChars, sendChatMessage, removeWhiteBackground};