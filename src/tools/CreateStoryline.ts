import { ITool } from "./interfaces/ITool";

class CreateStoryline implements ITool {
    name: string = "Create Storyline";
    description: string = "Create a new storyline for your game";
    run(): void {
        console.log("Creating a new storyline...");
    }
}

export { CreateStoryline };