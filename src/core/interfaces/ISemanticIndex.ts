interface ISemanticIndex {
    getEntity(entityType: EntityType, prompt: string): Promise<string | null>;
    addEntity(entityType: EntityType, name: string, context: string, jsonData: string): Promise<void>;
}

// Enum for the different types of entities
enum EntityType {
    Character = "Character",
    Location = "Location",
    Faction = "Faction",
    Item = "Item"
}


export { ISemanticIndex, EntityType };