import { IFileStore } from "./interfaces/IFileStore";
import * as fs from "fs";
import * as path from "path";

class FileSystemStore implements IFileStore {
    saveFile(filePath: string, fileContent: string): void {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, fileContent, "utf8");
    }

    loadFile(filePath: string): string {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        return fs.readFileSync(filePath, "utf8");
    }
}

export { FileSystemStore };