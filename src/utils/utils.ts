function stripInvalidFilenameChars(name: string): string {
    return name.replace(/[^a-z0-9]/gi, "_");
}

// Send a chat message to the chat window
function sendChatMessage(message: string): void {
    ChatMessage.create({ content: message });
}

export { stripInvalidFilenameChars, sendChatMessage};