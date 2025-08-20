import { fileService, FileUploadData } from './file.service';
import { generateS3Key } from '../config/s3';
import crypto from 'crypto';
import { Request } from 'express';
import { db } from '../config/db';

// Interfacce per i tipi
export interface UploadRequest {
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  section: 'commesse' | 'rapportini' | 'documenti' | 'costi' | 'ricavi';
  category: string;
  entityType: 'commessa' | 'rapportino' | 'documento' | 'costo' | 'ricavo';
  entityId?: string;
  visibility?: 'private' | 'company' | 'public';
  metadata?: Record<string, any>;
  approvalRequired?: boolean;
}

export interface UploadResponse {
  fileId: string;
  uploadUrl: string;
  s3Key: string;
  expiresAt: Date;
  status: 'pending_upload';
}

export interface UploadValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class UploadService {
  private readonly maxFileSize: number;
  private readonly allowedMimeTypes: string[];
  private readonly maxFilesPerRequest: number;

  constructor() {
    // Configurazione da variabili d'ambiente
    this.maxFileSize = this.parseFileSize(process.env.MAX_FILE_SIZE || '100MB');
    this.allowedMimeTypes = this.parseAllowedMimeTypes();
    this.maxFilesPerRequest = parseInt(process.env.MAX_FILES_PER_REQUEST || '10');
  }

  /**
   * Converte stringa dimensione file in bytes
   */
  private parseFileSize(sizeString: string): number {
    const units: { [key: string]: number } = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024,
    };

    const match = sizeString.match(/^(\d+(?:\.\d+)?)\s*([KMGT]?B)$/i);
    if (!match) {
      return 100 * 1024 * 1024; // Default 100MB
    }

    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    
    return value * (units[unit] || 1);
  }

  /**
   * Parsing MIME types consentiti
   */
  private parseAllowedMimeTypes(): string[] {
    const defaultTypes = [
      // Documenti
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
      
      // Immagini
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      
      // Archivi
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      
      // Altri
      'application/json',
      'application/xml',
    ];

    const envTypes = process.env.ALLOWED_MIME_TYPES;
    if (envTypes) {
      return envTypes.split(',').map(t => t.trim());
    }

    return defaultTypes;
  }

  /**
   * Valida richiesta upload
   */
  validateUploadRequest(request: UploadRequest): UploadValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validazione filename
    if (!request.originalFilename || request.originalFilename.trim().length === 0) {
      errors.push('Nome file richiesto');
    } else if (request.originalFilename.length > 255) {
      errors.push('Nome file troppo lungo (max 255 caratteri)');
    }

    // Validazione dimensione file
    if (request.fileSize <= 0) {
      errors.push('Dimensione file non valida');
    } else if (request.fileSize > this.maxFileSize) {
      errors.push(`File troppo grande (max ${this.formatFileSize(this.maxFileSize)})`);
    }

    // Validazione MIME type
    if (!request.mimeType) {
      errors.push('Tipo MIME richiesto');
    } else if (!this.allowedMimeTypes.includes(request.mimeType)) {
      errors.push(`Tipo file non supportato: ${request.mimeType}`);
      warnings.push('Tipi supportati: ' + this.allowedMimeTypes.slice(0, 5).join(', ') + '...');
    }

    // Validazione sezione
    const validSections = ['commesse', 'rapportini', 'documenti', 'costi', 'ricavi'];
    if (!validSections.includes(request.section)) {
      errors.push(`Sezione non valida: ${request.section}`);
    }

    // Validazione categoria
    if (!request.category || request.category.trim().length === 0) {
      errors.push('Categoria richiesta');
    } else if (request.category.length > 100) {
      errors.push('Categoria troppo lunga (max 100 caratteri)');
    }

    // Validazione entity type
    const validEntityTypes = ['commessa', 'rapportino', 'documento', 'costo', 'ricavo'];
    if (!validEntityTypes.includes(request.entityType)) {
      errors.push(`Tipo entità non valido: ${request.entityType}`);
    }

    // Validazione entity ID (se fornito)
    if (request.entityId && !this.isValidUUID(request.entityId)) {
      errors.push('ID entità non valido (deve essere UUID)');
    }

    // Validazione visibilità
    if (request.visibility && !['private', 'company', 'public'].includes(request.visibility)) {
      errors.push(`Visibilità non valida: ${request.visibility}`);
    }

    // Validazione metadata
    if (request.metadata && typeof request.metadata !== 'object') {
      errors.push('Metadati devono essere un oggetto');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Verifica se stringa è UUID valido
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Formatta dimensione file per display
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Genera hash file per deduplication
   */
  async generateFileHash(fileBuffer: Buffer): Promise<string> {
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Verifica se file esiste già (deduplication)
   */
  async checkFileDuplicate(companyId: string, fileHash: string): Promise<boolean> {
    try {
      const existingFile = await fileService.checkFileExists(companyId, fileHash);
      return existingFile !== null;
    } catch (error) {
      console.error('Errore nel controllo duplicati:', error);
      return false;
    }
  }

  /**
   * Prepara upload file
   */
  async prepareFileUpload(
    uploadRequest: UploadRequest,
    companyId: string,
    userId: string
  ): Promise<UploadResponse> {
    try {
      // Validazione richiesta
      const validation = this.validateUploadRequest(uploadRequest);
      if (!validation.isValid) {
        throw new Error(`Validazione fallita: ${validation.errors.join(', ')}`);
      }

      // Verifica duplicati (opzionale, può essere disabilitata)
      if (process.env.ENABLE_DUPLICATE_CHECK === 'true') {
        const tempHash = await this.generateFileHash(Buffer.from('temp'));
        const isDuplicate = await this.checkFileDuplicate(companyId, tempHash);
        if (isDuplicate) {
          throw new Error('File duplicato rilevato');
        }
      }

      // Crea record file nel database
      const fileRecord = await fileService.createFileRecord(uploadRequest, companyId, userId);

      // Genera presigned URL per upload
      const uploadUrl = await fileService.generateUploadUrl(
        fileRecord.s3_key,
        uploadRequest.mimeType,
        parseInt(process.env.UPLOAD_EXPIRY_SECONDS || '3600')
      );

      // Calcola scadenza
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + parseInt(process.env.UPLOAD_EXPIRY_SECONDS || '3600'));

      return {
        fileId: fileRecord.id,
        uploadUrl,
        s3Key: fileRecord.s3_key,
        expiresAt,
        status: 'pending_upload',
      };
    } catch (error) {
      console.error('Errore nella preparazione upload:', error);
      throw error;
    }
  }

  /**
   * Conferma upload completato
   */
  async confirmUpload(fileId: string, companyId: string, fileHash: string): Promise<void> {
    try {
      // Aggiorna hash file e status
      await fileService.updateFileHash(fileId, fileHash);

      // Verifica che file esista su S3
      const fileRecord = await fileService.getFileById(fileId, companyId);
      if (!fileRecord) {
        throw new Error('File non trovato');
      }

      const existsOnS3 = await fileService.checkS3FileExists(fileRecord.s3_key);
      if (!existsOnS3) {
        throw new Error('File non trovato su S3');
      }

      console.log(`✅ Upload confermato per file: ${fileId}`);
    } catch (error) {
      console.error('Errore nella conferma upload:', error);
      throw error;
    }
  }

  /**
   * Gestisce upload multipli
   */
  async prepareMultipleUploads(
    uploadRequests: UploadRequest[],
    companyId: string,
    userId: string
  ): Promise<UploadResponse[]> {
    try {
      // Validazione numero file
      if (uploadRequests.length > this.maxFilesPerRequest) {
        throw new Error(`Troppi file richiesti (max ${this.maxFilesPerRequest})`);
      }

      // Validazione singole richieste
      const validationResults = uploadRequests.map(req => this.validateUploadRequest(req));
      const invalidRequests = validationResults.filter(result => !result.isValid);
      
      if (invalidRequests.length > 0) {
        const errors = invalidRequests.flatMap(result => result.errors);
        throw new Error(`Validazione fallita: ${errors.join(', ')}`);
      }

      // Prepara upload per ogni file
      const uploadPromises = uploadRequests.map(req => 
        this.prepareFileUpload(req, companyId, userId)
      );

      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Errore nella preparazione upload multipli:', error);
      throw error;
    }
  }

  /**
   * Ottiene statistiche upload per tenant
   */
  async getUploadStats(companyId: string): Promise<any> {
    try {
      const stats = await fileService.getFileStats(companyId);
      
      // Calcola totali
      const totalFiles = stats.reduce((sum: number, stat: any) => sum + parseInt(stat.file_count), 0);
      const totalSize = stats.reduce((sum: number, stat: any) => sum + parseInt(stat.total_size || 0), 0);
      
      return {
        totalFiles,
        totalSize,
        totalSizeFormatted: this.formatFileSize(totalSize),
        statsBySection: stats,
        maxFileSize: this.formatFileSize(this.maxFileSize),
        allowedMimeTypes: this.allowedMimeTypes,
      };
    } catch (error) {
      console.error('Errore nel recupero statistiche upload:', error);
      throw new Error('Impossibile recuperare statistiche upload');
    }
  }

  /**
   * Pulisce file orfani (record nel DB ma non su S3)
   */
  async cleanupOrphanedFiles(companyId: string): Promise<number> {
    try {
      // Trova file con status 'pending_upload' più vecchi di 1 ora
      const query = `
        SELECT id, s3_key FROM file_attachments 
        WHERE company_id = $1 
        AND status = 'pending_upload' 
        AND created_at < NOW() - INTERVAL '1 hour'
      `;
      
      const result = await db.query(query, [companyId]);
      let cleanedCount = 0;

      for (const file of result.rows) {
        try {
          // Verifica se esiste su S3
          const existsOnS3 = await fileService.checkS3FileExists(file.s3_key);
          
          if (!existsOnS3) {
            // Marca come eliminato
            await db.query(
              'UPDATE file_attachments SET status = $1 WHERE id = $2',
              ['deleted', file.id]
            );
            cleanedCount++;
          }
        } catch (error) {
          console.error(`Errore nella pulizia file ${file.id}:`, error);
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('Errore nella pulizia file orfani:', error);
      return 0;
    }
  }
}

// Esporta istanza singleton
export const uploadService = new UploadService();
