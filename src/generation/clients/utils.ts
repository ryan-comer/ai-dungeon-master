import * as fs from 'fs';

// Repeat text generation until valid JSON is returned
async function RepeatJsonGeneration(prompt: string, 
    generationFunction: (input: string) => Promise<string>, 
    regenerateCheckFunction: (input: string) => boolean = (input: string) => true,
    numAttempts: number=3) {
    let currentAttempt = 0

    let response: string = ""
    let responseJson: string = ""

    while (currentAttempt < numAttempts) {
        response = await generationFunction(prompt)
        responseJson = TryParseJson(response, true)

        if (responseJson != null && regenerateCheckFunction(responseJson)) {
            return responseJson
        }

        console.log("Failed to generate valid JSON, retrying...")

        currentAttempt += 1
    }

    throw new Error("Failed to parse JSON")
}

function TryParseJson(buffer: string, returnString: boolean=false): any {
    const firstBracket = buffer.indexOf("{");
    const lastBracket = buffer.lastIndexOf("}");
    const jsonText = buffer.substring(firstBracket, lastBracket + 1);
    console.log(jsonText);

    try {
        let textObj = JSON.parse(jsonText);
        if (returnString) {
            return JSON.stringify(textObj, null, '\t');
        } else {
            return textObj;
        }
    } catch (e) {
        console.error("Failed to parse JSON chunk:", e);
        return null;
    }
}

function SaveImage(base64Data: string, filename: string): void {
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filename, buffer);
}

export { TryParseJson, RepeatJsonGeneration, SaveImage}