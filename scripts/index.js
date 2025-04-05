import { initializeMainWindow } from "./main-window.js";

function initializeModule() {
    initializeMainWindow();
}

function initializeSettings() {
    game.settings.register("ai-dungeon-master", "openaiApiKey", {
        name: "OpenAI API Key",
        hint: "Enter your OpenAI API key for text generation.",
        scope: "world",
        config: true,
        type: String,
        default: ""
    });

    game.settings.register("ai-dungeon-master", "googleApiKey", {
        name: "Google API Key",
        hint: "Enter your Google API key for text generation.",
        scope: "world",
        config: true,
        type: String,
        default: ""
    });
}

Hooks.on('ready', () => {
    initializeSettings();
    initializeModule();
});