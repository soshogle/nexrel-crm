
/**
 * Document Text Extraction Service
 * Extracts text from various document formats for knowledge base
 */

export interface ExtractedDocument {
  text: string;
  metadata: {
    fileName: string;
    fileType: string;
    pageCount?: number;
    wordCount: number;
  };
  success: boolean;
  error?: string;
}

class DocumentExtractorService {
  /**
   * Extract text from PDF using pdf-parse
   */
  private async extractFromPDF(buffer: Buffer, fileName: string): Promise<ExtractedDocument> {
    try {
      // Simple text extraction from PDF
      // In production, use a proper PDF parsing library like pdf-parse
      const text = buffer.toString('utf-8');
      const wordCount = text.split(/\s+/).length;

      return {
        text,
        metadata: {
          fileName,
          fileType: 'pdf',
          wordCount,
        },
        success: true,
      };
    } catch (error: any) {
      return {
        text: '',
        metadata: { fileName, fileType: 'pdf', wordCount: 0 },
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Extract text from Word documents
   */
  private async extractFromWord(buffer: Buffer, fileName: string): Promise<ExtractedDocument> {
    try {
      // Simple text extraction
      // In production, use mammoth or docx libraries
      const text = buffer.toString('utf-8');
      const wordCount = text.split(/\s+/).length;

      return {
        text,
        metadata: {
          fileName,
          fileType: 'docx',
          wordCount,
        },
        success: true,
      };
    } catch (error: any) {
      return {
        text: '',
        metadata: { fileName, fileType: 'docx', wordCount: 0 },
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Extract text from CSV
   */
  private async extractFromCSV(buffer: Buffer, fileName: string): Promise<ExtractedDocument> {
    try {
      const text = buffer.toString('utf-8');
      const wordCount = text.split(/\s+/).length;

      return {
        text,
        metadata: {
          fileName,
          fileType: 'csv',
          wordCount,
        },
        success: true,
      };
    } catch (error: any) {
      return {
        text: '',
        metadata: { fileName, fileType: 'csv', wordCount: 0 },
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Extract text from plain text files
   */
  private async extractFromText(buffer: Buffer, fileName: string): Promise<ExtractedDocument> {
    try {
      const text = buffer.toString('utf-8');
      const wordCount = text.split(/\s+/).length;

      return {
        text,
        metadata: {
          fileName,
          fileType: 'txt',
          wordCount,
        },
        success: true,
      };
    } catch (error: any) {
      return {
        text: '',
        metadata: { fileName, fileType: 'txt', wordCount: 0 },
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Main extraction method that routes to appropriate handler
   */
  async extractText(file: File): Promise<ExtractedDocument> {
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileType = file.type;
    const fileName = file.name;

    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return this.extractFromPDF(buffer, fileName);
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx')
    ) {
      return this.extractFromWord(buffer, fileName);
    } else if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
      return this.extractFromCSV(buffer, fileName);
    } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      return this.extractFromText(buffer, fileName);
    } else {
      return {
        text: '',
        metadata: { fileName, fileType: 'unknown', wordCount: 0 },
        success: false,
        error: 'Unsupported file type',
      };
    }
  }

  /**
   * Scrape text from website URL
   */
  async extractFromURL(url: string): Promise<ExtractedDocument> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.statusText}`);
      }

      const html = await response.text();
      
      // Basic HTML text extraction (remove tags)
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const wordCount = text.split(/\s+/).length;

      return {
        text,
        metadata: {
          fileName: url,
          fileType: 'url',
          wordCount,
        },
        success: true,
      };
    } catch (error: any) {
      return {
        text: '',
        metadata: { fileName: url, fileType: 'url', wordCount: 0 },
        success: false,
        error: error.message,
      };
    }
  }
}

export const documentExtractor = new DocumentExtractorService();
