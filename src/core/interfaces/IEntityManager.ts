import { Character } from "../models/Character";
import { Location } from "../models/Location";
import { Faction } from "../models/Faction";
import { Storyline } from "../models/Storyline";
import { Campaign } from "../models/Campaign";
import { Setting } from "../models/Setting";

interface IEntityManager {
    createCharacter(userPrompt: string, setting: Setting, campaign: Campaign, storyline?: Storyline): Promise<Character>;
    createLocation(userPrompt: string, setting: Setting, campaign: Campaign, storyline?: Storyline): Promise<Location>;
    createFaction(userPrompt: string, setting: Setting, campaign: Campaign, storyline?: Storyline): Promise<Faction>;

    getCharacters(setting: Setting, campaign: Campaign): Promise<Character[]>;
    getLocations(setting: Setting, campaign: Campaign): Promise<Location[]>;
    getFactions(setting: Setting, campaign: Campaign): Promise<Faction[]>;

    getCharacter(name: string, setting: Setting, campaign: Campaign): Promise<Character|null>;
    getLocation(name: string, setting: Setting, campaign: Campaign): Promise<Location|null>;
    getFaction(name: string, setting: Setting, campaign: Campaign): Promise<Faction|null>;

    getCharacterFromContext(context: string, setting: Setting, campaign: Campaign): Promise<Character|null>;
    getLocationFromContext(context: string, setting: Setting, campaign: Campaign): Promise<Location|null>;
    getFactionFromContext(context: string, setting: Setting, campaign: Campaign): Promise<Faction|null>;

}

export { IEntityManager };