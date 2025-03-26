interface IEntityManager {
    createCharacter(setting: string, campaign: string, userPrompt: string): Promise<string>;
}

export { IEntityManager };