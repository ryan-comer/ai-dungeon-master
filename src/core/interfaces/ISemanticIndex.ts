interface ISemanticIndex {
    getEntity(entityType: EntityType, context: string): Promise<any | null>;
    addEntity(entityType: EntityType, name: string, context: string, jsonData: string): Promise<any>;
}

// Enum for the different types of entities
enum EntityType {
    Character = "Character",
    Location = "Location",
    Faction = "Faction",
    Item = "Item"
}


export { ISemanticIndex, EntityType };