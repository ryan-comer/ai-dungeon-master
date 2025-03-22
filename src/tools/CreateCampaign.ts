import { ITool } from "./interfaces/ITool";

class CreateCampaign implements ITool {
    name: string = "Create Campaign";
    description: string = "Create a new campaign for your game";
    run(): void {
        console.log("Creating a new campaign...");
    }
}

export { CreateCampaign };