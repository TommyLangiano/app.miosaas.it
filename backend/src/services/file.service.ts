import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db } from '../config/db';
import { generateS3Key } from '../config/s3';
import crypto from 'crypto';
import { Readable } from 'stream';

// Interfacce per i tipi
export interface FileUploadData {
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

export interface FileRecord {
  id: string;
  company_id: string;
  s3_key: string;
  s3_bucket: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  section: string;
  category: string;
  entity_type: string;
  entity_id?: string;
  visibility: string;
  status: string;
  metadata: Record<string, any>;
  created_by: string;
  updated_by?: string;
  created_at: Date;
  updated_at: Date;
  uploaded_at?: Date;
  last_accessed_at?: Date;
  access_count: number;
  thumbnail_url?: string;
  preview_url?: string;
}

export interface FileSearchParams {
  companyId: string;
  section?: string;
  category?: string;
  entityType?: string;
  entityId?: string;
  status?: string;
  visibility?: string;
  searchTerm?: string;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface FileUpdateData {
  visibility?: string;
  status?: string;
  metadata?: Record<string, any>;
  approvalRequired?: boolean;
  approvalNotes?: string;
}

export class FileService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.S3_REGION || 'eu-north-1',
    });
    this.bucketName = process.env.S3_BUCKET_NAME || 'miosaas-files-dev';
  }

  /**
   * Genera hash SHA256 per un file
   */
  private async generateFileHash(buffer: Buffer): Promise<string> {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Verifica se un file esiste già (deduplication)
   */
  async checkFileExists(companyId: string, fileHash: string): Promise<FileRecord | null> {
    try {
      const query = `
        SELECT * FROM file_attachments 
        WHERE company_id = $1 AND file_hash = $2 AND status != 'deleted'
        LIMIT 1
      `;
      
      const result = await db.query(query, [companyId, fileHash]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Errore nel controllo esistenza file:', error);
      throw new Error('Impossibile verificare esistenza file');
    }
  }

  /**
   * Crea record file nel database
   */
  async createFileRecord(uploadData: FileUploadData, companyId: string, userId: string): Promise<FileRecord> {
    try {
      const s3Key = generateS3Key({
        companyId,
        section: uploadData.section,
        category: uploadData.category,
        entityId: uploadData.entityId,
        filename: uploadData.originalFilename,
      });

      const query = `
        INSERT INTO file_attachments (
          company_id, s3_key, s3_bucket, original_filename, file_size, mime_type,
          file_hash, section, category, entity_type, entity_id, visibility,
          status, metadata, approval_required, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `;

      const values = [
        companyId,
        s3Key,
        this.bucketName,
        uploadData.originalFilename,
        uploadData.fileSize,
        uploadData.mimeType,
        await this.generateFileHash(Buffer.from('temp')), // Placeholder, sarà aggiornato
        uploadData.section,
        uploadData.category,
        uploadData.entityType,
        uploadData.entityId || null,
        uploadData.visibility || 'private',
        'pending_upload',
        uploadData.metadata || {},
        uploadData.approvalRequired || false,
        userId,
      ];

      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Errore nella creazione record file:', error);
      throw new Error('Impossibile creare record file');
    }
  }

  /**
   * Aggiorna hash file dopo upload
   */
  async updateFileHash(fileId: string, fileHash: string): Promise<void> {
    try {
      const query = `
        UPDATE file_attachments 
        SET file_hash = $1, status = 'active', uploaded_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;
      
      await db.query(query, [fileHash, fileId]);
    } catch (error) {
      console.error('Errore nell\'aggiornamento hash file:', error);
      throw new Error('Impossibile aggiornare hash file');
    }
  }

  /**
   * Genera presigned URL per upload
   */
  async generateUploadUrl(s3Key: string, contentType: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        ContentType: contentType,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      console.error('Errore nella generazione presigned URL upload:', error);
      throw new Error('Impossibile generare URL upload');
    }
  }

  /**
   * Genera presigned URL per download
   */
  async generateDownloadUrl(s3Key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      console.error('Errore nella generazione presigned URL download:', error);
      throw new Error('Impossibile generare URL download');
    }
  }

  /**
   * Verifica esistenza file su S3
   */
  async checkS3FileExists(s3Key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if ((error as any).name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Elimina file da S3 e database
   */
  async deleteFile(fileId: string, companyId: string): Promise<void> {
    try {
      // Ottieni informazioni file
      const fileQuery = `
        SELECT s3_key FROM file_attachments 
        WHERE id = $1 AND company_id = $2
      `;
      
      const fileResult = await db.query(fileQuery, [fileId, companyId]);
      if (fileResult.rows.length === 0) {
        throw new Error('File non trovato');
      }

      const s3Key = fileResult.rows[0].s3_key;

      // Elimina da S3
      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      await this.s3Client.send(deleteCommand);

      // Marca come eliminato nel database
      const updateQuery = `
        UPDATE file_attachments 
        SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND company_id = $2
      `;
      
      await db.query(updateQuery, [fileId, companyId]);
    } catch (error) {
      console.error('Errore nell\'eliminazione file:', error);
      throw new Error('Impossibile eliminare file');
    }
  }

  /**
   * Aggiorna metadati file
   */
  async updateFile(fileId: string, companyId: string, updateData: FileUpdateData): Promise<FileRecord> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (updateData.visibility !== undefined) {
        fields.push(`visibility = $${paramCount++}`);
        values.push(updateData.visibility);
      }

      if (updateData.status !== undefined) {
        fields.push(`status = $${paramCount++}`);
        values.push(updateData.status);
      }

      if (updateData.metadata !== undefined) {
        fields.push(`metadata = $${paramCount++}`);
        values.push(updateData.metadata);
      }

      if (updateData.approvalRequired !== undefined) {
        fields.push(`approval_required = $${paramCount++}`);
        values.push(updateData.approvalRequired);
      }

      if (updateData.approvalNotes !== undefined) {
        fields.push(`approval_notes = $${paramCount++}`);
        values.push(updateData.approvalNotes);
      }

      if (fields.length === 0) {
        throw new Error('Nessun campo da aggiornare');
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(fileId, companyId);

      const query = `
        UPDATE file_attachments 
        SET ${fields.join(', ')}
        WHERE id = $${paramCount++} AND company_id = $${paramCount++}
        RETURNING *
      `;

      const result = await db.query(query, values);
      if (result.rows.length === 0) {
        throw new Error('File non trovato');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Errore nell\'aggiornamento file:', error);
      throw new Error('Impossibile aggiornare file');
    }
  }

  /**
   * Cerca file con filtri
   */
  async searchFiles(params: FileSearchParams): Promise<{ files: FileRecord[]; total: number }> {
    try {
      let whereConditions = ['company_id = $1'];
      let values: any[] = [params.companyId];
      let paramCount = 2;

      if (params.section) {
        whereConditions.push(`section = $${paramCount++}`);
        values.push(params.section);
      }

      if (params.category) {
        whereConditions.push(`category = $${paramCount++}`);
        values.push(params.category);
      }

      if (params.entityType) {
        whereConditions.push(`entity_type = $${paramCount++}`);
        values.push(params.entityType);
      }

      if (params.entityId) {
        whereConditions.push(`entity_id = $${paramCount++}`);
        values.push(params.entityId);
      }

      if (params.status) {
        whereConditions.push(`status = $${paramCount++}`);
        values.push(params.status);
      }

      if (params.visibility) {
        whereConditions.push(`visibility = $${paramCount++}`);
        values.push(params.visibility);
      }

      if (params.searchTerm) {
        whereConditions.push(`(
          original_filename ILIKE $${paramCount} OR 
          extracted_text ILIKE $${paramCount}
        )`);
        values.push(`%${params.searchTerm}%`);
        paramCount++;
      }

      whereConditions.push(`status != 'deleted'`);

      const whereClause = whereConditions.join(' AND ');

      // Query per conteggio totale
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM file_attachments 
        WHERE ${whereClause}
      `;

      const countResult = await db.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);

      // Query per file con paginazione
      const orderBy = params.orderBy || 'created_at';
      const orderDirection = params.orderDirection || 'DESC';
      const limit = params.limit || 50;
      const offset = params.offset || 0;

      const searchQuery = `
        SELECT * FROM file_attachments 
        WHERE ${whereClause}
        ORDER BY ${orderBy} ${orderDirection}
        LIMIT $${paramCount++} OFFSET $${paramCount++}
      `;

      const searchValues = [...values, limit, offset];
      const searchResult = await db.query(searchQuery, searchValues);

      return {
        files: searchResult.rows,
        total,
      };
    } catch (error) {
      console.error('Errore nella ricerca file:', error);
      throw new Error('Impossibile cercare file');
    }
  }

  /**
   * Ottiene file per ID
   */
  async getFileById(fileId: string, companyId: string): Promise<FileRecord | null> {
    try {
      const query = `
        SELECT * FROM file_attachments 
        WHERE id = $1 AND company_id = $2 AND status != 'deleted'
      `;
      
      const result = await db.query(query, [fileId, companyId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Errore nel recupero file:', error);
      throw new Error('Impossibile recuperare file');
    }
  }

  /**
   * Ottiene statistiche file per tenant
   */
  async getFileStats(companyId: string): Promise<any> {
    try {
      const query = `
        SELECT 
          section,
          category,
          COUNT(*) as file_count,
          SUM(file_size) as total_size,
          AVG(file_size) as avg_size
        FROM file_attachments 
        WHERE company_id = $1 AND status != 'deleted'
        GROUP BY section, category
        ORDER BY section, category
      `;
      
      const result = await db.query(query, [companyId]);
      return result.rows;
    } catch (error) {
      console.error('Errore nel recupero statistiche file:', error);
      throw new Error('Impossibile recuperare statistiche file');
    }
  }

  /**
   * Aggiorna statistiche accesso file
   */
  async updateFileAccessStats(fileId: string): Promise<void> {
    try {
      const query = `
        UPDATE file_attachments 
        SET last_accessed_at = CURRENT_TIMESTAMP, access_count = access_count + 1
        WHERE id = $1
      `;
      
      await db.query(query, [fileId]);
    } catch (error) {
      console.error('Errore nell\'aggiornamento statistiche accesso:', error);
      // Non lanciare errore per non bloccare il download
    }
  }
}

// Esporta istanza singleton
export const fileService = new FileService();
