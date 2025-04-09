import { Setting } from "../models/Setting";
import { Campaign } from "../models/Campaign";

interface ISemanticIndex {
    getEntity(entityType: EntityType, context: string, setting: Setting, campaign: Campaign): Promise<any | null>;
    addEntity(entityType: EntityType, name: string, context: string, jsonData: string, setting: Setting, campaign: Campaign): Promise<any>;
}

// Enum for the different types of entities
enum EntityType {
    Character = "Character",
    Location = "Location",
    Faction = "Faction",
    Item = "Item"
}


export { ISemanticIndex, EntityType };