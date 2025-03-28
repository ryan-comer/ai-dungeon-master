import { Character } from "../campaigns/models/Character";
import { Location } from "../campaigns/models/Location";
import { Faction } from "../campaigns/models/Faction";
import { Storyline } from "../campaigns/models/Storyline";

interface IEntityManager {
    createCharacter(userPrompt: string, storyline?: Storyline): Promise<Character>;
    createLocation(userPrompt: string, storyline?: Storyline): Promise<Location>;
    createFaction(userPrompt: string, storyline?: Storyline): Promise<Faction>;

    getCharacter(context: string): Promise<Character|null>;
    getLocation(context: string): Promise<Location|null>;
    getFaction(context: string): Promise<Faction|null>;
}

export { IEntityManager };