import { ITool } from "./interfaces/ITool";

import { IContextManager } from "../core/interfaces/IContextManager";
// import RepeatJsonGeneration removed; using structured output instead
import { Encounter } from "../core/models/Encounter";
import { EncounterSchema } from "../core/models/google/EncounterSchema";
import { Schema, Type } from '@google/genai';

import { stripInvalidFilenameChars } from "../utils/utils";
import { max } from "fp-ts/lib/ReadonlyNonEmptyArray";
import { details } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/prosemirror/schema/other.mjs";

class CreateEncounterTool implements ITool {
    name: string = "CreateEncounter";
    description: string = `
    Create a new combat encounter for the players.
    This tool will fire when the players are in a combat situation and need to create a new encounter.
    Typically, this occurs when a fight is about to start, and the DM says 'Roll for initiative'.
    `;

    async run(contextManager: IContextManager): Promise<void> {
        const chatHistory: string[] = (await contextManager.getChatMessages()).map(m => `${m.speaker}: ${m.message}`);
        const context: string = chatHistory.join("\n");
        const prompt: string = await this.getEncounterPrompt(contextManager, context);

        // Generate structured Encounter output using schema
        const encounter: Encounter = await contextManager.textGenerationClient.generateText<Encounter>(
            prompt,
            chatHistory,
            {
                thinkingConfig: { thinkingBudget: 2048 }
            },
            undefined,
            EncounterSchema
        );
        console.log("Encounter created:", encounter);

        // Create the scene for the encounter
        const backgroundWidth: number = {
            'square': 1024,
            'portrait': 768,
            'landscape': 1360
        }[encounter.backgroundImageDimension] || 1024;
        const backgroundHeight: number = {
            'square': 1024,
            'portrait': 1360,
            'landscape': 768
        }[encounter.backgroundImageDimension] || 1024;
        const baseEncounterPath: string = `${contextManager.fileStore.getBasePath()}/encounters/${stripInvalidFilenameChars(encounter.name)}`;
        const backgroundImage: string = await this.createEncounterScene(encounter, contextManager, baseEncounterPath, backgroundWidth, backgroundHeight);

        // Create the different entities in the encounter
        const actors: Actor[] = await this.createEncounterEntities(encounter, contextManager, baseEncounterPath);

        // Create the tokens for the entities in the encounter
        await this.createEntityTokens(encounter, contextManager, backgroundImage, backgroundWidth, backgroundHeight, actors);

        contextManager.logger.info("Encounter created successfully:", encounter.name);
    }

    // Create tokens for the entities in the encounter and place them on the map
    async createEntityTokens(encounter: Encounter, contextManager: IContextManager, backgroundImage: string, 
        backgroundWidth: number, backgroundHeight: number, actors: Actor[]): Promise<void> {
        const prompt = this.getEntityPlacementPrompt(encounter);
        const chatHistory = (await contextManager.getChatMessages()).map(m => `${m.speaker}: ${m.message}`);
        // Schema for token placements
        const TokenPlacementSchema: Schema = {
            type: Type.OBJECT,
            properties: {
                tokens: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            x: { type: Type.NUMBER },
                            y: { type: Type.NUMBER }
                        },
                        required: ['name', 'x', 'y']
                    }
                }
            },
            required: ['tokens']
        };
        const placement = await contextManager.textGenerationClient.generateText<{
            tokens: { name: string; x: number; y: number }[];
        }>(
            prompt,
            chatHistory,
            undefined,
            backgroundImage,
            TokenPlacementSchema
        );
        for (const token of placement.tokens) {
            const actor: Actor | undefined = actors.find((actor) => actor.name === token.name);
            if (actor) {
                // Calculate the x and y coordinates based on the background image size
                const x: number = Math.round(token.x * backgroundWidth);
                const y: number = Math.round(token.y * backgroundHeight);
                const tokenData: any = await actor.getTokenDocument({ x, y });
                await canvas?.scene?.createEmbeddedDocuments("Token", [tokenData]);
            } else {
                console.warn(`Actor not found for token: ${token.name}`);
            }
        }
    }

    // Create an entity for the encounter in FoundryVTT
    async createEncounterEntities(encounter: Encounter, contextManager: IContextManager, baseEncounterPath: string): Promise<Actor[]> {
        const newActors: Actor[] = [];

        for (const entity of encounter.entities) {
            // Generate the image
            const newPrompt: string = `DnD character token art of ${entity.tokenPrompt}, full body shot, solid white background`;
            const imageData = await contextManager.imageGenerationClient.generateImage(newPrompt, {
                width: 1024,
                height: 1024
            });
            const imagePath: string = `${baseEncounterPath}/${stripInvalidFilenameChars(entity.name)}.png`;
            const processedImage: string = await contextManager.imageGenerationClient.removeBackground(imageData);
            await contextManager.fileStore.saveImage(imagePath, processedImage);

            // Create the actor in FoundryVTT
            // Initialize the folders if necessary
            const folderName: string = encounter.name;

            // Attempt to find the folder by name
            let folder: Folder | undefined = game.folders?.find(f => f.name === folderName && f.type === "Actor");

            // If the folder doesn't exist, create it
            if (!folder) {
                folder = await Folder.create({
                    name: folderName,
                    type: "Actor",
                    color: "#FF0000" // Optional: Set a color for the folder
                });
            }

            // Define the actor data
            const actorData: any = {
                name: entity.name,
                type: "npc", // Ensure this matches the correct type for your system
                img: imagePath, // Optional: Set a token image
                folder: folder?.id, // Assign the actor to the 'Encounters' folder
                system: {
                    attributes: {
                        hp: {
                            value: entity.hitPoints,
                            max: entity.hitPoints
                        },
                        ac: {
                            value: entity.armorClass
                        },
                        movement: {
                            ...entity.movement
                        }
                    },
                    abilities: {
                        str: {
                            value: entity.abilities.strength
                        },
                        dex: {
                            value: entity.abilities.dexterity
                        },
                        con: {
                            value: entity.abilities.constitution
                        },
                        int: {
                            value: entity.abilities.intelligence
                        },
                        wis: {
                            value: entity.abilities.wisdom
                        },
                        cha: {
                            value: entity.abilities.charisma
                        }
                    },
                    details: {
                        biography: {
                            value: `<h3>Description</h3>${entity.description}`
                        },
                        cr: entity.cr,
                    },
                    traits: {
                        size: entity.size
                    }
                }
            };

            // Create the new actor
            const newActor: any = await Actor.create(actorData);
            console.log("Actor created:", newActor);

            // Add the weapons
            for (const weapon of entity.weapons) {
                // Generate the image for the weapon
                /*
                const imageData = await contextManager.imageGenerationClient.generateImage(weapon.imagePrompt, {
                    width: 1024,
                    height: 1024
                });
                const imagePath: string = `${baseEncounterPath}/${stripInvalidFilenameChars(entity.name)}/${stripInvalidFilenameChars(weapon.name)}.png`;
                await contextManager.fileStore.saveImage(imagePath, imageData);
                */

                const weaponData: any = {
                    name: weapon.name,
                    //img: imagePath,
                    type: "weapon",
                    system: {
                        description: {
                            value: `<h3>Description</h3>${weapon.description}<br><br><h3>Effect</h3>${weapon.effect}`
                        }
                    }
                };
                await newActor.createEmbeddedDocuments("Item", [weaponData]);
            }

            // Add the equipment
            for (const equipment of entity.equipment) {
                // Generate the image for the weapon
                /*
                const imageData = await contextManager.imageGenerationClient.generateImage(equipment.imagePrompt, {
                    width: 1024,
                    height: 1024
                });
                const imagePath: string = `${baseEncounterPath}/${stripInvalidFilenameChars(entity.name)}/${stripInvalidFilenameChars(equipment.name)}.png`;
                await contextManager.fileStore.saveImage(imagePath, imageData);
                */

                const equipmentData: any = {
                    name: equipment.name,
                    //img: imagePath,
                    type: "equipment",
                    system: {
                        description: {
                            value: `<h3>Description</h3>${equipment.description}<br><br><h3>Effect</h3>${equipment.effect}`
                        }
                    }
                };
                await newActor.createEmbeddedDocuments("Item", [equipmentData]);
            }

            // Add the spells
            for (const spell of entity.spells) {
                // Generate the image for the spell
                /*
                const imageData = await contextManager.imageGenerationClient.generateImage(spell.imagePrompt, {
                    width: 1024,
                    height: 1024
                });
                const imagePath: string = `${baseEncounterPath}/${stripInvalidFilenameChars(entity.name)}/${stripInvalidFilenameChars(spell.name)}.png`;
                await contextManager.fileStore.saveImage(imagePath, imageData);
                */
                const spellData: any = {
                    name: spell.name,
                    //img: imagePath,
                    type: "spell",
                    system: {
                        description: {
                            value: `<h3>Description</h3>${spell.description}<br><br><h3>Effect</h3>${spell.effect}`
                        }
                    }
                };
                await newActor.createEmbeddedDocuments("Item", [spellData]);
            }

            // Add the feats
            for (const feature of entity.features) {
                // Generate the image for the feature
                /*
                const imageData = await contextManager.imageGenerationClient.generateImage(feature.imagePrompt, {
                    width: 1024,
                    height: 1024
                });
                const imagePath: string = `${baseEncounterPath}/${stripInvalidFilenameChars(entity.name)}/${stripInvalidFilenameChars(feature.name)}.png`;
                await contextManager.fileStore.saveImage(imagePath, imageData);
                */
                const featureData: any = {
                    name: feature.name,
                    //img: imagePath,
                    type: "feat",
                    system: {
                        description: {
                            value: `<h3>Description</h3>${feature.description}<br><br><h3>Effect</h3>${feature.effect}`
                        }
                    }
                };
                await newActor.createEmbeddedDocuments("Item", [featureData]);
            }

            newActors.push(newActor);
        }
        
        return newActors;
    }


    // Create a scene for the encounter in FoundryVTT
    async createEncounterScene(encounter: Encounter, contextManager: IContextManager, baseEncounterPath: string, backgroundWidth: number, backgroundHeight: number): Promise<string> {
        const newPrompt: string = `RPGmap, Top down view. Birds eye view. From above. ${encounter.battlemapPrompt}`;
        const imageData = await contextManager.imageGenerationClient.generateImage(newPrompt, {
            width: backgroundWidth,
            height: backgroundHeight
        });
        const randomSuffix = Math.floor(Math.random() * 1000000); // Generate a random number
        const imagePath: string = `${baseEncounterPath}/battlemap_${randomSuffix}.png`;
        await contextManager.fileStore.saveImage(imagePath, imageData);

        const newScene: any = await Scene.create({
            name: encounter.name,
            active: true,
            width: backgroundWidth,
            height: backgroundHeight,
            padding: 0,
            background: {
                src: imagePath
            },
            grid: {
                type: 1,
                size: 100
            },
            tokenVision: false
        });

        await newScene.activate();
        await (newScene as Scene).createThumbnail();

        // Ask if the background is good
        const result = await foundry.applications.api.DialogV2.prompt({
            window: {
                title: "Battlemap Confirmation",
                frame: false,
                positioned: false,
                icon: "",
                controls: [],
                minimizable: false,
                resizable: true,
                contentTag: "",
                contentClasses: []
            },
            content: `<p>Is the background image good?</p>`,
            buttons: [
                {
                    action: "ok",
                    label: "OK",
                    default: true,
                    callback: (): any => {
                        console.log("User confirmed the background image.");
                    }
                },
                {
                    action: "regenerate",
                    label: "Regenerate",
                    callback: (): any => {
                        console.log("User wants to regenerate the background image.");
                    }
                }
            ],
            modal: true
        })

        if (result === "regenerate") {
            // Recursively re-generate the image until the user is satisfied
            return this.createEncounterScene(encounter, contextManager, baseEncounterPath, backgroundWidth, backgroundHeight);
        } else {
            return imageData;
        }
    }

    async getEncounterPrompt(contextManager: IContextManager, context: string): Promise<string> {
        // Get the players in the encounter
        const players: any[] = await contextManager.getPlayers();


        return `
        I want you to create an encounter for my players using the DND 5E rules.
        I will give you the context the players are in, and you will create an encounter for them.
        The encounter should be balanced and challenging for the players based on their level and abilities.
        Give the entities enough weapons, equipment, spells, and features so that they can perform well in the encounter, but make sure they make sense to have
        In the effects for the items, make sure to say if they are a bonus action, reaction, or action to use.
        This should follow something like the CR (Challenge Rating) system.
        The encounter should be scaled appropriately for the player.
        It is possible that the encounter will be too easy or too hard for the players, that is all based on the context.
        Use the context to figure out what the challenge should be, then design the encounter using something like CR to do so.
        Make sure the encounter is relevant to the context that I give you.

        The context is: ${context}

        The players that are in the encounter are:
        ${JSON.stringify(players, null, 2)}

        The response should have the following JSON format:

        {
            "name": "Name of the encounter",
            "description": "Description of the encounter",
            "battlemapPrompt": "Prompt for an image generator to create a battlemap for the encounter. This should be a detailed prompt that has a lot of information about the scene of the encounter. Don't include the characters themselves, just the scene that they're fighting in. The more detail the better.",
            "backgroundImageDimension": "square|portrait|landscape", // The dimension of the background image (string). Must be one of those options. Choose the option that best fits the encounter based on the context.
            "entities": [
                {
                "name": "Name of the entity",
                "description": "Description of the entity",
                "tokenPrompt": "Prompt for an image generator to create a token for the entity. This should be a detailed prompt that has a lot of information about the entity. This should include all of the physical characteristics of the entity. This information will be used to create the token for the character. The more detail the better.",
                "count": 1, // Number of entities in the encounter (number)
                "level": 1, // Level of the entity (number)
                "alignment": "The alignment of the entity",
                "abilities": {
                    "strength": 1, // Strength score (number)
                    "dexterity": 1, // Dexterity score (number)
                    "constitution": 1, // Constitution score (number)
                    "intelligence": 1, // Intelligence score (number)
                    "wisdom": 1, // Wisdom score (number)
                    "charisma": 1 // Charisma score (number)
                },
                "armorClass": 1, // Armor class of the entity (number)
                "hitPoints": 1, // Hit points of the entity (number)
                "movement": {
                    "burrow": 0, // Burrow speed (number)
                    "climb": 0, // Climb speed (number)
                    "fly": 0, // Fly speed (number)
                    "hover": false, // Hover ability (boolean)
                    "swim": 0, // Swim speed (number)
                    "walk": 0 // Walk speed (number)
                }
                "weapons": [
                    {
                    "name": "Name of the weapon",
                    "description": "Description of the weapon",
                    "effect": "What the weapon does, how it's used, etc",
                    "imagePrompt": "Pompt for an image generator to create a UI element that represents the weapon. This should be a detailed prompt that has a lot of information about the weapon. The more detail the better. Make sure the description would look good in a UI element."
                    }
                ],
                // Any other items that the entity has (e.g. armor, potions, scrolls, etc)
                "equipment": [
                    {
                        "name": "Name of the item",
                        "description": "Description of the item",
                        "effect": "What the item does, how it's used, etc",
                        "imagePrompt": "Pompt for an image generator to create a UI element that represents the item. This should be a detailed prompt that has a lot of information about the item. The more detail the better. Make sure the description would look good in a UI element."
                    }
                ]
                "spells": [
                    {
                    "name": "Name of the spell",
                    "description": "Description of the spell",
                    "effect": "What the spell does, how it's used, etc",
                    "imagePrompt": "Prompt for an image generator to create an image of the spell. This should be a detailed prompt that has a lot of information about the spell. The more detail the better."
                    }
                ],
                "features": [
                    {
                    "name": "Name of the feature",
                    "description": "Description of the feature,
                    "effect": "What the feature does, how it's used, etc",
                    "imagePrompt": "Prompt for an image generator to create an image of the feature. This should be a detailed prompt that has a lot of information about the feature. The more detail the better."
                    }
                ],
                "cr": 1.0 // Challenge rating of the entity (floating point number, e.g. 1.0, 2.5, etc), this is standard for DnD and is used to determine the difficulty of the encounter
                "size": "SIZE_OF_CHARACTER",    // ["tiny", "sm", "med", "lg", "huge", "grg"]
                }
            ]
            }

            Only reply with the JSON response. Do not add anything else to the response.
            Make sure the JSON is valid and follows the format above.
        `
    }

    getEntityPlacementPrompt(encounter: Encounter): string {
        return `
        I am going to give you a battlemap image of an encounter for a tabletop RPG game.
        I am also going to give you JSON that describes the encounter.
        This JSON includes the entities that are in the encounter.
        I want you to tell me where on the map the entities should be placed.
        Each entity has a 'count' property that tells you how many of that entity there are.
        Make sure to use that count property to determine how many of that entity there are on the map.
        I want you to give me a list of the entities and their positions on the map.
        Their position should be in the format of x and y coordinates that range from 0.0 to 1.0.
        0.0 is the top left of the map, and 1.0 is the bottom right of the map.
        The x coordinate is the left to right position, and the y coordinate is the top to bottom position.

        The encounter JSON is:
        ${JSON.stringify(encounter)}

        I want you to give me a JSON response that looks like this:
        {
            tokens: [
                {
                    "name": "Name of the entity",
                    "x": 0.55, // X coordinate (number between 0.0 and 1.0)
                    "y": 0.55, // Y coordinate (number between 0.0 and 1.0)
                },
                ...
            ]
        }

        Only reply with the JSON response. Do not add anything else to the response.
        `
    }
}

export { CreateEncounterTool };