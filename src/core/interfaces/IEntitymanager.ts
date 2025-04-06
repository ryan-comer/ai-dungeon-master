import { Character } from "../models/Character";
import { Location } from "../models/Location";
import { Faction } from "../models/Faction";
import { Storyline } from "../models/Storyline";

interface IEntityManager {
    createCharacter(userPrompt: string, storyline?: Storyline): Promise<Character>;
    createLocation(userPrompt: string, storyline?: Storyline): Promise<Location>;
    createFaction(userPrompt: string, storyline?: Storyline): Promise<Faction>;

    getCharacter(context: string): Promise<Character|null>;
    getLocation(context: string): Promise<Location|null>;
    getFaction(context: string): Promise<Faction|null>;
}

export { IEntityManager };