import { IEncounterManager } from './interfaces/IEncounterManager';
import { IContextManager } from './interfaces/IContextManager';
import { Encounter } from "./models/Encounter"
import { Player } from "./models/Player";
import * as t from 'io-ts';
import { isRight } from 'fp-ts/Either';
import { Schema, Type } from '@google/genai';
import { sendChatMessage } from '../utils/utils';

// JSON schema for NPCActions structured output
const NPCActionsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    action: { type: Type.STRING },
    bonusAction: { type: Type.STRING },
    reaction: { type: Type.STRING },
    movement: {
      type: Type.OBJECT,
      properties: {
        x: { type: Type.NUMBER },
        y: { type: Type.NUMBER }
      },
      required: ['x', 'y']
    }
  },
  required: ['action', 'bonusAction', 'reaction', 'movement']
};

class EntityState {
    name: string = "";
    location: {
        x: number;
        y: number;
    } = { x: 0, y: 0 };
    hp: number = 0;
    ac: number = 0;
    initiative: number = 0;
    abilityScores: {
        [key: string]: number;
    } = {
        strength: 0,
        dexterity: 0,
        constitution: 0,
        intelligence: 0,
        wisdom: 0,
        charisma: 0,
    };
    death: {
        failed: number;
        success: number;
    } = {
        failed: 0,
        success: 0,
    };
    statuses: any[] = [];
    concentration: {
        currentSpell: string;
    } = {
        currentSpell: "",
    };
    movement: {
        burrow: number;
        climb: number;
        fly: number;
        swim: number;
        walk: number;
    } = {
        burrow: 0,
        climb: 0,
        fly: 0,
        swim: 0,
        walk: 0,
    };
}

class NPCActions {
    action: string = "";
    bonusAction: string = "";
    reaction: string = "";
    movement: {
        x: number;
        y: number;
    } = { x: 0, y: 0 };
}
const NPCActionsCodec = t.type({
    action: t.string,
    bonusAction: t.string,
    reaction: t.string,
    movement: t.type({
        x: t.number,
        y: t.number
    })
});


// Model class to track the encounter state
class EncounterState {
    players: EntityState[] = [];
    enemies: EntityState[] = [];
}

class EncounterManager implements IEncounterManager {

    private contextManager: IContextManager | null = null;
    private encounterState: EncounterState | null = null;
    
    private lastMoveMarker: any = null;

    init(contextManager: IContextManager): void {
        this.contextManager = contextManager;

        // Check if combat is active
        if (game.combat && game.combat.started) {
            console.log("Combat is already active.");
            this.startEncounter(contextManager);
        }

        Hooks.on("combatStart", (combat, updateData) => {
            console.log("Combat started.");
            this.startEncounter(contextManager);
            this.handleCombatantTurn(combat, updateData, {});
        });
    }

    startEncounter(contextManager: IContextManager): void {
        // Register for turn events
        Hooks.on("combatTurn", (combat, updateData, updateOptions) => {
            this.handleCombatantTurn(combat, updateData, updateOptions);
        });
        Hooks.on('combatRound', (combat, updateData, updateOptions) => {
            this.handleCombatantTurn(combat, updateData, updateOptions);
        });
    }

    async handleCombatantTurn(combat: any, updateData: any, updateOptions: any): Promise<void> {
        console.log("Combat: ", combat)
        console.log("Update Data: ", updateData)
        console.log("Update Options: ", updateOptions)

        if (this.lastMoveMarker != null && this.lastMoveMarker != undefined) {
            try {
                await canvas?.scene?.deleteEmbeddedDocuments("Drawing", [this.lastMoveMarker.id]);
            } catch (error) {
                console.error("Error deleting last move marker:", error);
            }

            this.lastMoveMarker = null;
        }

        const turn: number = updateData.turn;
        const currentCombatant: Combatant | null = combat.turns[turn];
        if (!currentCombatant) return;

        const actor = currentCombatant.actor;
        const token = currentCombatant.token;

        if (!actor) {
            console.error("No actor found for the current combatant.");
            return;
        }

        if (!token) {
            console.error("No token found for the current combatant.");
            return;
        }

        // Skip players
        if (actor.hasPlayerOwner) {
            console.log("Skipping player turn.");
            return;
        }

        this.updateEncounterState();
        await this.onTurnStart(actor, token);
    }

    endEncounter(): void {
        console.log("Encounter ended.");
    }

    async onTurnStart(actor: Actor, token: TokenDocument): Promise<void> {
        console.log(`It's now ${actor?.name}'s turn.`);

        // Only control NPCs
        if (actor.hasPlayerOwner) {
            console.log("Skipping player turn.");
            return;
        }

        await sendChatMessage(`Determining actions for ${actor?.name}...`);

        // Get the current NPC's details
        const npcLocation = this.getGridXY(token.x, token.y);
        const npcActionsPrompt = this.getNPCActionsPrompt(actor, npcLocation);

        // Generate structured NPC actions
        const npcActions: NPCActions = await this.contextManager!.textGenerationClient.generateText<NPCActions>(
            npcActionsPrompt,
            [],
            { thinkingConfig: { thinkingBudget: 1024 } },
            undefined,
            NPCActionsSchema
        );

        console.log("NPC Actions:", npcActions);

        // Place the marker for movement if the NPC is moving
        console.log("NPC Location:", npcLocation);
        console.log("NPC Actions Location:", npcActions?.movement);
        if (npcActions?.movement.x !== npcLocation.x || npcActions?.movement.y !== npcLocation.y) {
            console.log("Moving NPC to new location:", npcActions?.movement);

            const gs: number = canvas?.scene?.grid.size ?? 1;
            const base = {
                x: npcLocation.x * gs,
                y: npcLocation.y * gs,
            }
            const data: any = {
                shape: {
                    type: "r",
                    width: gs,
                    height: gs
                },
                x: npcActions?.movement.x * gs,
                y: npcActions?.movement.y * gs,
                strokeWidth: 8,
                strokeColor: "#FF0000",
                fillColor: "#FF0000",
                fillAlpha: 0.5,
                layer: "DrawingsLayer"
            }

            const markerList: any = await canvas?.scene?.createEmbeddedDocuments("Drawing", [data]);
            this.lastMoveMarker = markerList[0];
        }

        // Format with HTML
        await sendChatMessage(`
        <div style="background-color: #f0f0f0; padding: 10px; border-radius: 5px;">
            <strong>${actor?.name}'s Actions:</strong><br>
            <strong>Action:</strong> ${npcActions?.action}<br>
            <strong>Bonus Action:</strong> ${npcActions?.bonusAction}<br>
            <strong>Reaction:</strong> ${npcActions?.reaction}<br>
            <strong>Movement:</strong> (${npcActions?.movement.x}, ${npcActions?.movement.y})<br>
        `);
    }

    // Update the encounter state by looking at all the players and enemies in the encounter
    updateEncounterState(): void {
        // Loop through all the tokens
        const tokens: Token[] | undefined = canvas?.tokens?.placeables;
        const players: EntityState[] = [];
        const enemies: EntityState[] = [];

        if (!tokens) return;

        for (const token of tokens) {
            const actor: any = token.actor;
            if (!actor) continue;

            const entityState = new EntityState();
            entityState.name = actor.name;
            entityState.location = {...this.getGridXY(token.x, token.y)};
            entityState.hp = actor.system.attributes.hp.value;
            entityState.ac = actor.system.attributes.ac.value;
            entityState.abilityScores = {
                strength: actor.system.abilities.str.value,
                dexterity: actor.system.abilities.dex.value,
                constitution: actor.system.abilities.con.value,
                intelligence: actor.system.abilities.int.value,
                wisdom: actor.system.abilities.wis.value,
                charisma: actor.system.abilities.cha.value,
            };
            entityState.death = {
                failed: actor.system.attributes.death.failure,
                success: actor.system.attributes.death.success,
            };
            entityState.statuses = Array.from(actor.statuses);
            entityState.concentration = {
                currentSpell: actor.system.attributes.concentration.ability,
            };
            entityState.movement = {
                burrow: actor.system.attributes.movement.burrow,
                climb: actor.system.attributes.movement.climb,
                fly: actor.system.attributes.movement.fly,
                swim: actor.system.attributes.movement.swim,
                walk: actor.system.attributes.movement.walk,
            }

            // Check if the token is a player or an enemy
            if (actor.hasPlayerOwner) {
                players.push(entityState);
            } else {
                enemies.push(entityState);
            }
        }

        // Update the encounter state
        this.encounterState = new EncounterState();
        this.encounterState.players = players;
        this.encounterState.enemies = enemies;

        console.log("Updated encounter state:", this.encounterState);
    }

    getGridXY(x: number, y: number): { x: number; y: number } {
        const gridSizeX: number | undefined = canvas?.scene?.grid.sizeX;
        const gridSizeY: number | undefined = canvas?.scene?.grid.sizeY;

        if (!gridSizeX || !gridSizeY) {
            console.error("Grid size not found.");
            return { x: 0, y: 0 };
        }

        return {
            x: Math.floor(x / gridSizeX),
            y: Math.floor(y / gridSizeY),
        };
    }

    getNPCActionsPrompt(actor: Actor, location: {x: number, y: number}): string {
        return `
        You are a DM for a tabletop RPG game, and you need to decide what the NPC is going to do in the current encounter.
        I am going to give you the encounter state in JSON format which includes all of the entities and their properties.
        I am also going to give you which NPC you are going to control.
        I need to you tell me what the NPC is going to do next based on the current state of the encounter and what the NPC is capable of doing.
        Make sure to choose the best action for the NPC based on the current state of the encounter.

        All locations are given in grid coordinates.
        Each grid square is 5 feet by 5 feet.
        The NPC can move in any direction, but it can only move a certain number of squares based on its movement speed.
        For example, if the current NPC is at (1, 1) and wants to move to (1, 3), then they moved 10 feet.

        Each grid square is 5 feet by 5 feet.
        If an ability lists a range of 30 feet, then the NPC needs to be within 6 squares of the target to use that ability.
        If an ability lists a range of 60 feet, then the NPC needs to be within 12 squares of the target to use that ability.

        In the encounter state, the enemies that the players are fighting are listed under the "enemies" key.
        The players are listed under the "players" key.
        Make sure the NPCs that you're controlling take actions to help their side win.
        For example, the enemies should not try to help the players, but instead try to defeat them.

        Here is the encounter state:
        ${JSON.stringify(this.encounterState, null, 2)}

        Here is the NPC you are going to control:
        ${JSON.stringify({
            name: actor.name,
            location,
            weapons: actor.items.filter((item: any) => item.type === "weapon").map((item: any) => 
            {
                return {
                    name: item.name, 
                    description: item.system.description.value
                }
            }),
            spells: actor.items.filter((item: any) => item.type === "spell").map((item: any) => 
            {
                return {
                    name: item.name, 
                    description: item.system.description.value
                }
            }),
            equipment: actor.items.filter((item: any) => item.type === "equipment").map((item: any) =>
            {
                return {
                    name: item.name, 
                    description: item.system.description.value
                }
            }),
            features: actor.items.filter((item: any) => item.type === "feat").map((item: any) =>
            {
                return {
                    name: item.name, 
                    description: item.system.description.value
                }
            })
        }, null, 2)}

        I want you to give me the actions that the NPC should take in the following JSON format:
        {
            "action": "<action>",    // Description of the action the NPC will take (if any). Include all relevant details. If none, reply "none"
            "bonusAction": "<bonus action>",    // Description of the bonus action the NPC will take (if any). Include all relevant details. If none, reply "none"
            "reaction": "<reaction>",   // Description of the reaction the NPC will take (if any). Include all relevant details. If none, reply "none"
            // The new X and Y coordinates of the NPC after the movement
            "movement": {
                "x": <x>,
                "y": <y>
            }
        }

        Only reply with the JSON and nothing else.
        `
    }

}

export { EncounterManager };