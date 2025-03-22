interface IFileStore {
    saveFile(filePath: string, fileContent: string): void;
    loadFile(filePath: string): string;
}

export { IFileStore };