import { ITool } from "./interfaces/ITool";
import { IContextManager } from "../core/interfaces/IContextManager";
import { RepeatJsonGeneration } from "../generation/clients/utils";
import { stripInvalidFilenameChars } from "../utils/utils";

class SceneViewerTool implements ITool {
    name: string = "Scene Viewer Tool";
    description: string = `
        The tool will fire when the players enter a different area than the one they were in before.
        Use the conversation between the DM and players to determine if the players moved to a new location.
        If they moved to a new location, fire the tool
    `;

    async run(contextManager: IContextManager): Promise<void> {
        const scenePrompt: string = await RepeatJsonGeneration(this.getScenePrompt(), async (repeatPrompt: string):Promise<string> => {
            const chatHistory: string[] = await contextManager.getChatHistory();
            const response: string = await contextManager.textGenerationClient.generateText(repeatPrompt, chatHistory);
            return response;
        }, (response: string):boolean => {
            const responseJson: any = JSON.parse(response);
            return responseJson && responseJson.prompt && responseJson.name;
        });
        const scenePromptJson: any = JSON.parse(scenePrompt);

        const image: string = await contextManager.imageGenerationClient.generateImage(scenePrompt);
        // Image path with random numbers to avoid overwriting
        const randomSuffix = Math.floor(Math.random() * 1000000); // Generate a random number
        const imagePath: string = `${contextManager.fileStore.getBasePath()}/scenes/${stripInvalidFilenameChars(scenePromptJson.name)}_${randomSuffix}.png`;

        await contextManager.fileStore.saveImage(imagePath, image);

        // See if the scene already exists
        let scene: any = game.scenes?.getName(scenePromptJson.name);
        if (!scene) {
            // Create a new scene if it doesn't exist
            const sceneData = {
                name: scenePromptJson.name,
                active: true,
                width: 1024,
                height: 1024,
                padding: 0,
                background: {
                    src: imagePath
                },
                grid: {
                    type: 0
                },
                tokenVision: false
            };

            scene = await Scene.create(sceneData);
        } else {
            await scene.update({
                background: {
                    src: imagePath
                }
            });
        }

        await scene.activate();
        await scene.createThumbnail();
    }

    getScenePrompt(): string {
        return `
        Give me a prompt that describes the scene that the players are seeing.
        This prompt will be used in an image generator to create an image of the scene.
        The prompt should be as detailed as possible to describe the scene.
        The more details you give, the better the image will be.

        Reply with the following JSON format:
        {
            "name": "The name of the scene",
            "prompt": "The prompt that describes the scene",
        }

        Only reply with the JSON, nothing else.
        `
    }
}

export { SceneViewerTool };