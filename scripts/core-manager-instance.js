import { CoreManager } from "../src/core/CoreManager.ts";
import { HidreamClient } from "../src/generation/clients/HidreamClient.ts";
import { ForgeClient } from "../src/generation/clients/ForgeClient.ts";
import { ComfyUIClient } from "../src/generation/clients/ComfyUIClient.ts";
import { GoogleImageGen4Client } from "../src/generation/clients/GoogleImageGen4Client.ts";
import { GoogleClient } from "../src/generation/clients/GoogleClient.ts";
import { DiscordSpeechClient } from "../src/generation/clients/DiscordSpeechClient.ts";
import { FoundryStore } from "../src/utils/FoundryStore.ts";
import { Logger } from "../src/utils/Logger.ts";

let coreManagerInstance = null;

export function getCoreManager() {
    if (!coreManagerInstance) {
        const googleApiKey = game.settings.get("ai-dungeon-master", "googleApiKey");
        const logger = new Logger();
        coreManagerInstance = new CoreManager(
            new GoogleClient(googleApiKey),
            new ComfyUIClient("http://localhost:8188"),
            //new ForgeClient(),
            //new HidreamClient(),
            //new GoogleImageGen4Client(googleApiKey),
            new DiscordSpeechClient(),
            new FoundryStore(),
            logger
        );
    }
    return coreManagerInstance;
}
