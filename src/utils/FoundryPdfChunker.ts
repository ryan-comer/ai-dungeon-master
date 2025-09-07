import { ILogger } from "./interfaces/ILogger";
import { extractText, getDocumentProxy } from "unpdf";

export interface PdfChunk {
    id: string;
    title: string;
    content: string;
    level: number;
    path: string[];
    startPage: number;
    endPage: number;
    tokenEstimate: number;
    chunkIndex: number;
    sourceFile: string;
}

export interface ChunkedManual {
    fileName: string;
    totalPages: number;
    chunks: PdfChunk[];
    metadata: {
        extractedAt: string;
        totalChunks: number;
    };
}

/**
 * FoundryVTT-compatible PDF Chunker
 * Extracts text content from PDFs using browser-native methods and chunks by sections
 */
export class FoundryPdfChunker {
    private logger: ILogger;

    constructor(logger: ILogger) {
        this.logger = logger;
    }

    /**
     * Process a PDF file that was uploaded to FoundryVTT - extract real text and chunk it
     * @param pdfPath Path to the PDF in FoundryVTT's data folder
     * @param campaignDir Campaign directory path
     * @param chunkType Type of manual ('player' or 'gm')
     * @returns Promise<ChunkedManual>
     */
    async chunkPdfFromFoundry(pdfPath: string, campaignDir: string, chunkType: 'player' | 'gm'): Promise<ChunkedManual> {
        try {
            this.logger.info(`Starting PDF processing for: ${pdfPath}`);

            // Fetch the PDF file
            const response = await fetch(pdfPath);
            if (!response.ok) {
                throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
            }
            
            // Get ArrayBuffer from response
            const arrayBuffer = await response.arrayBuffer();
            const data = new Uint8Array(arrayBuffer);

            // Load PDF with unpdf
            const doc = await getDocumentProxy(data);
            const { text: pages } = await extractText(doc, { mergePages: false });

            const totalPages = doc.numPages;
            const fileName = pdfPath.split('/').pop() || pdfPath;

            this.logger.info(`Loaded PDF with ${totalPages} pages`);

            // Try to extract outline information if available
            // Note: unpdf doesn't provide outline access, so we'll rely on content-based detection
            
            // Build section boundaries using content-based detection
            let boundaries: Array<{title: string, level: number, page: number, path: string[]}> = [];
            
            this.logger.info("Using content-based heading detection for chunking");
            boundaries = this.detectHeadings(pages);

            // Create chunks from boundaries
            const chunks = this.sliceIntoChunks(pages, boundaries, fileName);

            // Split large chunks for better RAG performance
            const finalChunks = this.splitLargeChunks(chunks, pages);

            this.logger.info(`Successfully processed PDF: ${fileName}, Pages: ${totalPages}, Chunks: ${finalChunks.length}`);

            const chunkedManual: ChunkedManual = {
                fileName,
                totalPages,
                chunks: finalChunks,
                metadata: {
                    extractedAt: new Date().toISOString(),
                    totalChunks: finalChunks.length
                }
            };

            // Save chunks to filesystem for RAG ingestion
            await this.saveChunksToFilesystem(chunkedManual, campaignDir, chunkType);

            return chunkedManual;

        } catch (error) {
            this.logger.error(`Error processing PDF ${pdfPath}:`, error);
            throw error;
        }
    }

    /**
     * Create chunks from extracted text based on sections
     */
    private createChunksFromText(textPages: string[], fileName: string): PdfChunk[] {
        // This method is deprecated - keeping for compatibility but not used anymore
        return [];
    }

    /**
     * Normalize whitespace in extracted text
     */
    private normalizeWhitespace(str: string): string {
        return str
            .replace(/\u00a0/g, " ") // non-breaking space to regular space
            .replace(/[ \t]+\n/g, "\n") // remove trailing spaces before newlines
            .replace(/[ \t]{2,}/g, " "); // collapse multiple spaces/tabs
    }

    /**
     * Enhanced heading detection for unpdf text extraction
     */
    private detectHeadings(pages: string[]): Array<{title: string, level: number, page: number, path: string[]}> {
        const candidates: Array<{title: string, level: number, page: number, path: string[]}> = [];
        
        const headingRegexes = [
            // Chapter headers - high priority
            { regex: /^\s*(Chapter\s+\d+[:\s].*?)$/gim, level: 1 },
            { regex: /^\s*(CHAPTER\s+\d+[:\s].*?)$/gim, level: 1 },
            
            // Numbered sections with dots
            { regex: /^\s*(\d+\.\d+\.\d+\s+.*?)$/gim, level: 3 },
            { regex: /^\s*(\d+\.\d+\s+.*?)$/gim, level: 2 },
            { regex: /^\s*(\d+\.\s+.*?)$/gim, level: 2 },
            
            // Roman numerals
            { regex: /^\s*((?:[IVXLCDM]+\.?)\s+.+?)$/gim, level: 2 },
            
            // ALL CAPS headers (must be on their own line and substantial)
            { regex: /^([A-Z][A-Z\s&''\-:()]{4,80})$/gm, level: 1 },
            
            // Title Case headers (2+ capitalized words)
            { regex: /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,8})$/gm, level: 2 },
            
            // Common RPG section patterns
            { regex: /^(Creating\s+Characters?|Character\s+Creation|Building\s+Characters?)$/gim, level: 2 },
            { regex: /^(Combat|Fighting|Battle\s+Rules?)$/gim, level: 2 },
            { regex: /^(Magic|Spellcasting|Spells?)$/gim, level: 2 },
            { regex: /^(Equipment|Gear|Items?)$/gim, level: 2 },
            { regex: /^(Skills?\s+and\s+Abilities?|Abilities?)$/gim, level: 2 },
            { regex: /^(Game\s+Master|GM|Running\s+the\s+Game)$/gim, level: 1 },
            { regex: /^(NPCs?|Non-Player\s+Characters?)$/gim, level: 2 },
            { regex: /^(Adventures?|Scenarios?)$/gim, level: 2 },
            { regex: /^(Introduction|Getting\s+Started|Overview)$/gim, level: 1 },
        ];

        for (let i = 0; i < pages.length; i++) {
            const pageNum = i + 1;
            const pageText = this.normalizeWhitespace(pages[i]);
            const lines = pageText.split(/\n+/);
            
            for (let j = 0; j < lines.length; j++) {
                const line = lines[j].trim();
                if (line.length < 3 || line.length > 100) continue;
                
                // Skip if ends with period (often a sentence, not a heading)
                if (/\.\s*$/.test(line)) continue;
                
                // Skip if it's obviously part of a paragraph (lowercase start after space)
                if (j > 0 && /^[a-z]/.test(line)) continue;

                for (const { regex, level } of headingRegexes) {
                    const match = regex.exec(line);
                    if (match) {
                        const title = match[1] || match[0];
                        
                        // Additional validation
                        if (this.isValidHeading(title, line, lines, j)) {
                            candidates.push({
                                title: title.replace(/\s+/g, " ").trim(),
                                level,
                                page: pageNum,
                                path: [], // Will be filled later
                            });
                        }
                        
                        // Reset regex to avoid infinite loop
                        regex.lastIndex = 0;
                        break;
                    }
                }
            }
        }

        // Remove duplicates that are too close to each other
        const filtered = this.deduplicateHeadings(candidates);
        
        // Build hierarchy based on level
        const stack: Array<{title: string, level: number, page: number, path: string[]}> = [];
        for (const candidate of filtered) {
            // Remove items from stack that are same level or higher
            while (stack.length && stack[stack.length - 1].level >= candidate.level) {
                stack.pop();
            }
            
            // Build path from stack
            const parentPath = stack.length > 0 ? stack[stack.length - 1].path : [];
            const path = [...parentPath, candidate.title];
            candidate.path = path;
            stack.push(candidate);
        }
        
        this.logger.info(`Detected ${filtered.length} potential headings from content analysis`);
        return filtered;
    }

    /**
     * Validate if a detected line is actually a heading
     */
    private isValidHeading(title: string, line: string, lines: string[], lineIndex: number): boolean {
        // Must have some capitalized words
        const words = title.split(/\s+/);
        const hasCapitalized = words.some((w) => /^[A-Z]/.test(w));
        if (!hasCapitalized) return false;
        
        // Skip if it looks like a date or number sequence
        if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/.test(title)) return false;
        if (/^\d+[\s\-]*\d+[\s\-]*\d+/.test(title)) return false;
        
        // Skip if it's all numbers and punctuation
        if (/^[\d\s\-\.:]+$/.test(title)) return false;
        
        // Must not be too common/generic
        const commonFalsePositives = [
            /^page\s+\d+/i,
            /^table\s+\d+/i,
            /^figure\s+\d+/i,
            /^see\s+(page|chapter)/i,
            /^continued\s+(on|from)/i,
        ];
        if (commonFalsePositives.some(pattern => pattern.test(title))) return false;
        
        // Check context - headings are often followed by content
        const nextLine = lineIndex + 1 < lines.length ? lines[lineIndex + 1].trim() : '';
        const prevLine = lineIndex > 0 ? lines[lineIndex - 1].trim() : '';
        
        // Skip if surrounded by very short lines (likely not a heading)
        if (nextLine.length < 10 && prevLine.length < 10 && title.length < 20) return false;
        
        return true;
    }

    /**
     * Remove duplicate or overly similar headings
     */
    private deduplicateHeadings(candidates: Array<{title: string, level: number, page: number, path: string[]}>): Array<{title: string, level: number, page: number, path: string[]}> {
        const filtered: Array<{title: string, level: number, page: number, path: string[]}> = [];
        const minDistance = 2; // Minimum pages between similar headings
        
        for (const candidate of candidates) {
            const isDuplicate = filtered.some(existing => {
                // Same title
                if (existing.title.toLowerCase() === candidate.title.toLowerCase()) {
                    return Math.abs(existing.page - candidate.page) < minDistance;
                }
                
                // Very similar titles
                const similarity = this.calculateStringSimilarity(existing.title, candidate.title);
                if (similarity > 0.8 && Math.abs(existing.page - candidate.page) < minDistance) {
                    return true;
                }
                
                return false;
            });
            
            if (!isDuplicate) {
                filtered.push(candidate);
            }
        }
        
        // Sort by page order
        return filtered.sort((a, b) => a.page - b.page);
    }

    /**
     * Calculate string similarity (simple implementation)
     */
    private calculateStringSimilarity(str1: string, str2: string): number {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    /**
     * Calculate Levenshtein distance between two strings
     */
    private levenshteinDistance(str1: string, str2: string): number {
        const matrix: number[][] = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    /**
     * Guess hierarchical level from title formatting
     */
    private guessLevelFromTitle(title: string): number {
        // Very naive level inference:
        if (/^\s*\d+\.\d+\./.test(title)) return 3;
        if (/^\s*\d+\./.test(title)) return 2;
        if (/^\s*(?:[IVXLCDM]+)\b/i.test(title)) return 2;
        if (/^[A-Z0-9 &''\-:()]{5,}$/.test(title)) return 1; // ALL CAPS → top-level
        return 2;
    }

    /**
     * Assemble chunks from section boundaries
     */
    private sliceIntoChunks(
        pages: string[], 
        boundaries: Array<{title: string, level: number, page: number, path: string[]}>,
        fileName: string
    ): PdfChunk[] {
        if (!boundaries.length) {
            // No boundaries at all → one mega chunk
            const text = pages.join("\n\n");
            return [{
                id: "section:0",
                title: "Document",
                content: text,
                level: 1,
                path: ["Document"],
                startPage: 1,
                endPage: pages.length,
                tokenEstimate: this.estimateTokens(text),
                chunkIndex: 0,
                sourceFile: fileName,
            }];
        }

        // Make sure boundaries are unique per starting page
        const uniq: Array<{title: string, level: number, page: number, path: string[]}> = [];
        const seenPages = new Set<number>();
        
        for (const b of boundaries) {
            if (!b.page || b.page < 1) continue;
            if (b.page > pages.length) continue;
            if (seenPages.has(b.page)) continue;
            seenPages.add(b.page);
            uniq.push(b);
        }

        // Determine endPage of each boundary by the next boundary's start - 1
        const chunks: PdfChunk[] = [];
        for (let i = 0; i < uniq.length; i++) {
            const start = uniq[i].page;
            const end = i + 1 < uniq.length ? Math.max(start, uniq[i + 1].page - 1) : pages.length;
            const text = pages.slice(start - 1, end).join("\n\n").trim();
            
            chunks.push({
                id: `section:${i}`,
                title: uniq[i].title || `Section ${i + 1}`,
                content: text,
                level: uniq[i].level ?? 1,
                path: uniq[i].path?.length ? uniq[i].path : [uniq[i].title || `Section ${i + 1}`],
                startPage: start,
                endPage: end,
                tokenEstimate: this.estimateTokens(text),
                chunkIndex: i,
                sourceFile: fileName,
            });
        }
        
        return chunks;
    }

    /**
     * Split large chunks into smaller ones for better RAG performance
     */
    private splitLargeChunks(chunks: PdfChunk[], pages: string[]): PdfChunk[] {
        const MAX_TOKENS = 2500; // Tune to your model/context window
        const finalChunks: PdfChunk[] = [];
        
        for (const chunk of chunks) {
            if (chunk.tokenEstimate <= MAX_TOKENS) {
                finalChunks.push(chunk);
                continue;
            }
            
            // Split long chunk by page boundaries to keep structure intact
            for (let p = chunk.startPage; p <= chunk.endPage; p++) {
                const pageText = pages[p - 1].trim();
                if (!pageText) continue;
                
                finalChunks.push({
                    id: `${chunk.id}:p${p}`,
                    title: `${chunk.title} (p.${p})`,
                    content: pageText,
                    level: chunk.level,
                    path: [...chunk.path, `(p.${p})`],
                    startPage: p,
                    endPage: p,
                    tokenEstimate: this.estimateTokens(pageText),
                    chunkIndex: finalChunks.length,
                    sourceFile: chunk.sourceFile,
                });
            }
        }
        
        return finalChunks;
    }

    /**
     * Estimate token count for text (rough approximation)
     */
    private estimateTokens(text: string): number {
        // Very rough token estimate suitable for batching/limits
        const words = (text.match(/\S+/g) || []).length;
        return Math.round(words * 1.3);
    }

    /**
     * Save chunks to filesystem in formats optimized for RAG ingestion
     */
    private async saveChunksToFilesystem(chunkedManual: ChunkedManual, campaignDir: string, chunkType: 'player' | 'gm'): Promise<void> {
        try {
            const chunkFileName = `${chunkType}-manual-chunks.json`;
            const chunkDirName = `${chunkType}-manual-chunks`;
            
            // 1. Save complete metadata file (easy to load and search programmatically)
            const metadataPath = `${campaignDir}/${chunkFileName}`;
            await this.writeFile(metadataPath, JSON.stringify(chunkedManual, null, 2));
            this.logger.info(`Saved complete chunk metadata to: ${metadataPath}`);

            // 2. Save individual chunk files (enables selective loading)
            const chunksDir = `${campaignDir}/${chunkDirName}`;
            await this.ensureDirectory(chunksDir);

            // Save each chunk as individual file
            for (let i = 0; i < chunkedManual.chunks.length; i++) {
                const chunk = chunkedManual.chunks[i];
                const filename = this.sanitizeFilename(`${String(i + 1).padStart(3, '0')}-${chunk.title}`);
                const chunkPath = `${chunksDir}/${filename}.json`;
                
                // Save chunk with additional metadata for RAG
                const chunkData = {
                    ...chunk,
                    // Add RAG-specific metadata
                    wordCount: (chunk.content.match(/\S+/g) || []).length,
                    characterCount: chunk.content.length,
                    extractedAt: chunkedManual.metadata.extractedAt,
                    sourceDocument: chunkedManual.fileName,
                    // Add search-friendly fields
                    searchableText: `${chunk.title} ${chunk.path.join(' ')} ${chunk.content}`.toLowerCase(),
                    keywords: this.extractKeywords(chunk.content),
                };

                await this.writeFile(chunkPath, JSON.stringify(chunkData, null, 2));
            }
            
            this.logger.info(`Saved ${chunkedManual.chunks.length} individual chunk files to: ${chunksDir}`);

            // 3. Save RAG-optimized search index
            await this.saveSearchIndex(chunkedManual, campaignDir, chunkType);

        } catch (error) {
            this.logger.error(`Failed to save chunks to filesystem: ${error}`);
            throw error;
        }
    }

    /**
     * Save search index optimized for RAG retrieval
     */
    private async saveSearchIndex(chunkedManual: ChunkedManual, campaignDir: string, chunkType: string): Promise<void> {
        const indexData = {
            document: {
                filename: chunkedManual.fileName,
                totalPages: chunkedManual.totalPages,
                totalChunks: chunkedManual.chunks.length,
                extractedAt: chunkedManual.metadata.extractedAt,
                type: chunkType
            },
            index: {
                // Create title-to-chunk mapping
                byTitle: {} as Record<string, string>,
                // Create level-based grouping
                byLevel: {} as Record<number, string[]>,
                // Create type-based grouping
                byType: {
                    character: [] as string[],
                    combat: [] as string[],
                    magic: [] as string[],
                    equipment: [] as string[],
                    gm: [] as string[],
                    rules: [] as string[],
                    other: [] as string[]
                },
                // Create page range mapping
                byPageRange: [] as Array<{id: string, startPage: number, endPage: number, title: string}>,
                // Create keyword index
                keywords: {} as Record<string, string[]>
            }
        };

        // Build indices
        chunkedManual.chunks.forEach(chunk => {
            // Title index
            indexData.index.byTitle[chunk.title.toLowerCase()] = chunk.id;
            
            // Level index
            if (!indexData.index.byLevel[chunk.level]) {
                indexData.index.byLevel[chunk.level] = [];
            }
            indexData.index.byLevel[chunk.level].push(chunk.id);
            
            // Type classification
            const type = this.classifyChunkType(chunk);
            if (type in indexData.index.byType) {
                indexData.index.byType[type as keyof typeof indexData.index.byType].push(chunk.id);
            }
            
            // Page range index
            indexData.index.byPageRange.push({
                id: chunk.id,
                startPage: chunk.startPage,
                endPage: chunk.endPage,
                title: chunk.title
            });
            
            // Keyword index
            const keywords = this.extractKeywords(chunk.content);
            keywords.forEach(keyword => {
                if (!indexData.index.keywords[keyword]) {
                    indexData.index.keywords[keyword] = [];
                }
                indexData.index.keywords[keyword].push(chunk.id);
            });
        });

        const indexPath = `${campaignDir}/${chunkType}-manual-search-index.json`;
        await this.writeFile(indexPath, JSON.stringify(indexData, null, 2));
        this.logger.info(`Saved search index to: ${indexPath}`);
    }

    /**
     * Classify chunk type for easier RAG retrieval
     */
    private classifyChunkType(chunk: PdfChunk): 'character' | 'combat' | 'magic' | 'equipment' | 'gm' | 'rules' | 'other' {
        const titleLower = chunk.title.toLowerCase();
        const pathLower = chunk.path.join(' ').toLowerCase();
        const contentStart = chunk.content.substring(0, 500).toLowerCase();
        
        const typePatterns = {
            character: [
                /character\s*(creation|building|generation)/i,
                /creating\s*characters?/i,
                /abilities/i,
                /attributes/i,
                /skills?/i,
                /stats/i
            ],
            combat: [
                /combat/i,
                /fighting/i,
                /battle/i,
                /attack/i,
                /damage/i,
                /initiative/i,
                /armor/i
            ],
            magic: [
                /magic/i,
                /spell/i,
                /arcane/i,
                /divine/i,
                /casting/i,
                /enchant/i
            ],
            equipment: [
                /equipment/i,
                /gear/i,
                /items?/i,
                /weapons?/i,
                /armor/i,
                /tools?/i
            ],
            gm: [
                /game\s*master/i,
                /gm/i,
                /running/i,
                /npcs?/i,
                /adventures?/i,
                /scenarios?/i,
                /encounters?/i
            ],
            rules: [
                /rules?/i,
                /mechanics?/i,
                /system/i,
                /basic/i,
                /core/i
            ]
        };

        for (const [type, patterns] of Object.entries(typePatterns)) {
            if (patterns.some(pattern => 
                pattern.test(titleLower) || 
                pattern.test(pathLower) ||
                pattern.test(contentStart)
            )) {
                return type as keyof typeof typePatterns;
            }
        }
        
        return 'other';
    }

    /**
     * Extract keywords from text for search indexing
     */
    private extractKeywords(text: string): string[] {
        // Simple keyword extraction - remove common words and extract significant terms
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 
            'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
            'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
            'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
            'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their'
        ]);

        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word))
            .filter((word, index, arr) => arr.indexOf(word) === index); // Remove duplicates

        // Return top 20 most relevant keywords
        return words.slice(0, 20);
    }

    /**
     * Sanitize filename for filesystem compatibility
     */
    private sanitizeFilename(filename: string): string {
        return filename
            .replace(/[<>:"/\\|?*]/g, '-')  // Replace invalid chars with dash
            .replace(/\s+/g, '-')           // Replace spaces with dash
            .replace(/-+/g, '-')            // Collapse multiple dashes
            .replace(/^-|-$/g, '')          // Remove leading/trailing dashes
            .substring(0, 100);             // Limit length
    }

    /**
     * Ensure directory exists (create if needed) using FoundryVTT FilePicker
     */
    private async ensureDirectory(dirPath: string): Promise<void> {
        try {
            // Check if the directory exists by attempting to browse it
            await FilePicker.browse('data', dirPath);
        } catch (error) {
            // If browsing fails, the directory doesn't exist; attempt to create it
            try {
                await FilePicker.createDirectory('data', dirPath);
                this.logger.info(`Directory created: ${dirPath}`);
            } catch (createError) {
                this.logger.error(`Failed to create directory: ${dirPath}`, createError);
                throw createError;
            }
        }
    }

    /**
     * Write file to filesystem using FoundryVTT's FilePicker
     */
    private async writeFile(filePath: string, content: string): Promise<void> {
        try {
            // Extract directory path and filename
            const lastSlashIndex = filePath.lastIndexOf('/');
            const folderPath = lastSlashIndex > 0 ? filePath.substring(0, lastSlashIndex) : '';
            const fileName = filePath.substring(lastSlashIndex + 1);

            // Ensure directory exists
            if (folderPath) {
                await this.ensureDirectory(folderPath);
            }

            // Create File object and upload
            const file = new File([content], fileName, { type: 'application/json' });
            const result: any = await FilePicker.upload('data', folderPath, file, {});
            
            if (result && result.path) {
                this.logger.info(`File written successfully: ${result.path}`);
            } else {
                throw new Error("Upload failed - no result path returned");
            }
        } catch (error) {
            this.logger.error(`Failed to write file ${filePath}:`, error);
            throw error;
        }
    }

    /**
     * Search for relevant chunks based on a query
     * Useful for RAG workflows to find the most relevant sections
     */
    public searchChunks(chunkedManual: ChunkedManual, query: string, maxResults: number = 5): PdfChunk[] {
        const queryLower = query.toLowerCase();
        const queryTerms = queryLower.split(/\s+/).filter(term => term.length > 2);
        
        // Score chunks based on relevance
        const scoredChunks = chunkedManual.chunks.map(chunk => {
            let score = 0;
            const titleLower = chunk.title.toLowerCase();
            const contentLower = chunk.content.toLowerCase();
            const pathLower = chunk.path.join(' ').toLowerCase();
            
            // Title matches get higher scores
            queryTerms.forEach(term => {
                if (titleLower.includes(term)) {
                    score += 5;
                }
                if (pathLower.includes(term)) {
                    score += 3;
                }
                if (contentLower.includes(term)) {
                    score += 1;
                }
            });
            
            // Exact phrase matches get bonus points
            if (titleLower.includes(queryLower)) {
                score += 8;
            }
            if (contentLower.includes(queryLower)) {
                score += 3;
            }
            
            return { chunk, score };
        });
        
        // Sort by score and return top results
        return scoredChunks
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults)
            .map(item => item.chunk);
    }

    /**
     * Get chunks by section type for RPG manuals
     * Helps RAG workflows find specific types of information
     */
    public getChunksByType(chunkedManual: ChunkedManual, sectionType: 'character' | 'combat' | 'magic' | 'equipment' | 'gm' | 'rules'): PdfChunk[] {
        const typePatterns: Record<string, RegExp[]> = {
            character: [
                /character\s*(creation|building|generation)/i,
                /creating\s*characters?/i,
                /abilities/i,
                /attributes/i,
                /skills?/i,
                /stats/i
            ],
            combat: [
                /combat/i,
                /fighting/i,
                /battle/i,
                /attack/i,
                /damage/i,
                /initiative/i,
                /armor/i
            ],
            magic: [
                /magic/i,
                /spell/i,
                /arcane/i,
                /divine/i,
                /casting/i,
                /enchant/i
            ],
            equipment: [
                /equipment/i,
                /gear/i,
                /items?/i,
                /weapons?/i,
                /armor/i,
                /tools?/i
            ],
            gm: [
                /game\s*master/i,
                /gm/i,
                /running/i,
                /npcs?/i,
                /adventures?/i,
                /scenarios?/i,
                /encounters?/i
            ],
            rules: [
                /rules?/i,
                /mechanics?/i,
                /system/i,
                /basic/i,
                /core/i
            ]
        };

        const patterns = typePatterns[sectionType];
        if (!patterns) {
            return [];
        }

        return chunkedManual.chunks.filter(chunk => {
            const titleLower = chunk.title.toLowerCase();
            const pathLower = chunk.path.join(' ').toLowerCase();
            const contentStart = chunk.content.substring(0, 500).toLowerCase();
            
            return patterns.some(pattern => 
                pattern.test(titleLower) || 
                pattern.test(pathLower) ||
                pattern.test(contentStart)
            );
        });
    }

    /**
     * Get chunks by hierarchical level
     */
    public getChunksByLevel(chunkedManual: ChunkedManual, level: number): PdfChunk[] {
        return chunkedManual.chunks.filter(chunk => chunk.level === level);
    }

    /**
     * Get all top-level sections (chapters/major sections)
     */
    public getTopLevelSections(chunkedManual: ChunkedManual): PdfChunk[] {
        return this.getChunksByLevel(chunkedManual, 1);
    }

    /**
     * Find chunks containing specific page numbers
     */
    public getChunksByPageRange(chunkedManual: ChunkedManual, startPage: number, endPage?: number): PdfChunk[] {
        const end = endPage ?? startPage;
        return chunkedManual.chunks.filter(chunk => 
            chunk.startPage <= end && chunk.endPage >= startPage
        );
    }

    /**
     * Load chunked manual from filesystem
     */
    public async loadChunkedManual(campaignDir: string, chunkType: 'player' | 'gm'): Promise<ChunkedManual | null> {
        try {
            const chunkFileName = `${chunkType}-manual-chunks.json`;
            const filePath = `${campaignDir}/${chunkFileName}`;
            
            const content = await this.readFile(filePath);
            return JSON.parse(content) as ChunkedManual;
        } catch (error) {
            this.logger.warn(`Could not load chunked manual from ${campaignDir}:`, error);
            return null;
        }
    }

    /**
     * Load search index from filesystem
     */
    public async loadSearchIndex(campaignDir: string, chunkType: 'player' | 'gm'): Promise<any | null> {
        try {
            const indexPath = `${campaignDir}/${chunkType}-manual-search-index.json`;
            const content = await this.readFile(indexPath);
            return JSON.parse(content);
        } catch (error) {
            this.logger.warn(`Could not load search index from ${campaignDir}:`, error);
            return null;
        }
    }

    /**
     * Load individual chunk by ID from filesystem
     */
    public async loadChunkById(campaignDir: string, chunkType: 'player' | 'gm', chunkId: string): Promise<any | null> {
        try {
            const chunksDir = `${campaignDir}/${chunkType}-manual-chunks`;
            
            // First, load the search index to find the chunk filename
            const index = await this.loadSearchIndex(campaignDir, chunkType);
            if (!index) return null;
            
            // Find the chunk in the page range index (which includes IDs)
            const chunkInfo = index.index.byPageRange.find((item: any) => item.id === chunkId);
            if (!chunkInfo) return null;
            
            // Generate the expected filename
            const filename = this.sanitizeFilename(`${chunkId.split(':')[1].padStart(3, '0')}-${chunkInfo.title}`);
            const chunkPath = `${chunksDir}/${filename}.json`;
            
            const content = await this.readFile(chunkPath);
            return JSON.parse(content);
        } catch (error) {
            this.logger.warn(`Could not load chunk ${chunkId} from ${campaignDir}:`, error);
            return null;
        }
    }

    /**
     * Get RAG-ready context from chunks
     */
    public formatChunksForRAG(chunks: PdfChunk[], includeMetadata: boolean = true): string {
        return chunks.map(chunk => {
            const header = includeMetadata 
                ? `## ${chunk.title} (${chunk.sourceFile}, p.${chunk.startPage}-${chunk.endPage})`
                : `## ${chunk.title}`;
            
            const pathInfo = includeMetadata && chunk.path.length > 1
                ? `**Section Path:** ${chunk.path.join(' → ')}\n\n`
                : '';
            
            return `${header}\n\n${pathInfo}${chunk.content}`;
        }).join('\n\n---\n\n');
    }

    /**
     * Read file from filesystem using fetch
     */
    private async readFile(filePath: string): Promise<string> {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Failed to read file: ${response.status} ${response.statusText}`);
            }
            return await response.text();
        } catch (error) {
            throw new Error(`Failed to read file ${filePath}: ${error}`);
        }
    }
}
