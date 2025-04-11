import { ITool } from "./interfaces/ITool";

import { IContextManager } from "../core/interfaces/IContextManager";
import { RepeatJsonGeneration } from "../generation/clients/utils";
import { Encounter, EncounterCodec } from "../core/models/Encounter";

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
        const context: string = contextManager.chatHistory.join("\n");
        const prompt: string = this.getEncounterPrompt(context);
        
        // Get the Encounter object
        const result: string = await RepeatJsonGeneration(prompt, async (repeatPrompt: string): Promise<string> => {
            const response = await contextManager.textGenerationClient.generateText(repeatPrompt, contextManager.chatHistory);
            return response;
        }, (response: string): boolean => {
            try {
                const parsedResponse = JSON.parse(response);
                return EncounterCodec.is(parsedResponse);
            } catch (error) {
                return false;
            }
        });

        const encounter: Encounter = JSON.parse(result);
        console.log("Encounter created:", encounter);

        // Create the scene for the encounter
        const baseEncounterPath: string = `${contextManager.fileStore.getBasePath()}/encounters/${stripInvalidFilenameChars(encounter.name)}`;
        await this.createEncounterScene(encounter, contextManager, baseEncounterPath);

        // Create the different entities in the encounter
        await this.createEncounterEntities(encounter, contextManager, baseEncounterPath);

        contextManager.logger.info("Encounter created successfully:", encounter.name);
    }

    // Create an entity for the encounter in FoundryVTT
    async createEncounterEntities(encounter: Encounter, contextManager: IContextManager, baseEncounterPath: string): Promise<void> {
        for (const entity of encounter.entities) {
            // Generate the image
            const newPrompt: string = `A dnd character portrait of ${entity.tokenPrompt}, solid white background`;
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
                            value: entity.speed
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
                const imageData = await contextManager.imageGenerationClient.generateImage(weapon.imagePrompt, {
                    width: 1024,
                    height: 1024
                });
                const imagePath: string = `${baseEncounterPath}/${stripInvalidFilenameChars(entity.name)}/${stripInvalidFilenameChars(weapon.name)}.png`;
                await contextManager.fileStore.saveImage(imagePath, imageData);

                const weaponData: any = {
                    name: weapon.name,
                    img: imagePath,
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
                const imageData = await contextManager.imageGenerationClient.generateImage(equipment.imagePrompt, {
                    width: 1024,
                    height: 1024
                });
                const imagePath: string = `${baseEncounterPath}/${stripInvalidFilenameChars(entity.name)}/${stripInvalidFilenameChars(equipment.name)}.png`;
                await contextManager.fileStore.saveImage(imagePath, imageData);

                const equipmentData: any = {
                    name: equipment.name,
                    img: imagePath,
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
                const imageData = await contextManager.imageGenerationClient.generateImage(spell.imagePrompt, {
                    width: 1024,
                    height: 1024
                });
                const imagePath: string = `${baseEncounterPath}/${stripInvalidFilenameChars(entity.name)}/${stripInvalidFilenameChars(spell.name)}.png`;
                await contextManager.fileStore.saveImage(imagePath, imageData);
                const spellData: any = {
                    name: spell.name,
                    img: imagePath,
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
                const imageData = await contextManager.imageGenerationClient.generateImage(feature.imagePrompt, {
                    width: 1024,
                    height: 1024
                });
                const imagePath: string = `${baseEncounterPath}/${stripInvalidFilenameChars(entity.name)}/${stripInvalidFilenameChars(feature.name)}.png`;
                await contextManager.fileStore.saveImage(imagePath, imageData);
                const featureData: any = {
                    name: feature.name,
                    img: imagePath,
                    type: "feat",
                    system: {
                        description: {
                            value: `<h3>Description</h3>${feature.description}<br><br><h3>Effect</h3>${feature.effect}`
                        }
                    }
                };
                await newActor.createEmbeddedDocuments("Item", [featureData]);
            }
        }
    }


    // Create a scene for the encounter in FoundryVTT
    async createEncounterScene(encounter: Encounter, contextManager: IContextManager, baseEncounterPath: string): Promise<void> {
        const newPrompt: string = `A DnD battlemap of ${encounter.battlemapPrompt}, top down, 2D, the point of view is straight down from above.`;
        const imageData = await contextManager.imageGenerationClient.generateImage(newPrompt, {
            width: 1920,
            height: 1080
        });
        const imagePath: string = `${baseEncounterPath}/battlemap.png`;
        await contextManager.fileStore.saveImage(imagePath, imageData);

        const newScene: any = await Scene.create({
            name: encounter.name,
            active: true,
            width: 1920,
            height: 1080,
            padding: 0,
            background: {
                src: imagePath
            },
            grid: {
                type: 1,
                size: 100
            }
        });

        await newScene.activate();
        await (newScene as Scene).createThumbnail();
    }

    getEncounterPrompt(context: string): string {
        return `
        I want you to create an encounter for my players using the DND 5E rules.
        I will give you the context the players are in, and you will create an encounter for them.
        The encounter should be balanced and challenging for the players based on their level and abilities.
        This should follow something like the CR (Challenge Rating) system.
        The encounter should be scaled appropriately for the player.
        It is possible that the encounter will be too easy or too hard for the players, that is all based on the context.
        Use the context to figure out what the challenge should be, then design the encounter using something like CR to do so.
        Make sure the encounter is relevant to the context that I give you.

        The context is: ${context}

        The response should have the following JSON format:

        {
            "name": "Name of the encounter",
            "description": "Description of the encounter",
            "battlemapPrompt": "Prompt for an image generator to create a battlemap for the encounter. This should be a detailed prompt that has a lot of information about the scene of the encounter. Don't include the characters themselves, just the scene that they're fighting in. The more detail the better.",
            "entities": [
                {
                "name": "Name of the entity",
                "description": "Description of the entity",
                "tokenPrompt": "Prompt for an image generator to create a token for the entity. This should be a detailed prompt that has a lot of information about the entity. This should include all of the physical characteristics of the entity. This information will be used to create the token for the character. The more detail the better.",
                "count": 1, // Number of entities in the encounter (number)
                "class": "The class of the entity",
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
                "speed": 30, // Speed of the entity (number)
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
                "cr": 1,    // Challenge rating of the entity (number)
                "size": "SIZE_OF_CHARACTER",    // ["tiny", "sm", "med", "lg", "huge", "grg"]
                }
            ]
            }

            Only reply with the JSON response. Do not add anything else to the response.
            Make sure the JSON is valid and follows the format above.
        `
    }
}

export { CreateEncounterTool };