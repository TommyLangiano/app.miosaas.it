import { fileService, FileRecord } from './file.service';
import { Request } from 'express';
import { db } from '../config/db';

// Interfacce per i tipi
export interface DownloadRequest {
  fileId: string;
  userId: string;
  companyId: string;
  includeMetadata?: boolean;
}

export interface DownloadResponse {
  fileId: string;
  downloadUrl: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  expiresAt: Date;
  metadata?: Record<string, any>;
}

export interface DownloadPermission {
  canDownload: boolean;
  reason?: string;
  visibility: string;
  ownerId: string;
}

export interface FilePreviewData {
  fileId: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  thumbnailUrl?: string;
  previewUrl?: string;
  metadata: Record<string, any>;
}

export class DownloadService {
  private readonly downloadUrlExpiry: number;
  private readonly enableAccessTracking: boolean;

  constructor() {
    this.downloadUrlExpiry = parseInt(process.env.DOWNLOAD_URL_EXPIRY_SECONDS || '3600');
    this.enableAccessTracking = process.env.ENABLE_ACCESS_TRACKING === 'true';
  }

  /**
   * Verifica permessi download per un utente
   */
  async checkDownloadPermission(
    fileId: string,
    userId: string,
    companyId: string
  ): Promise<DownloadPermission> {
    try {
      // Ottieni informazioni file
      const file = await fileService.getFileById(fileId, companyId);
      if (!file) {
        return {
          canDownload: false,
          reason: 'File non trovato',
          visibility: 'unknown',
          ownerId: '',
        };
      }

      // Verifica che file sia attivo
      if (file.status !== 'active') {
        return {
          canDownload: false,
          reason: 'File non disponibile per il download',
          visibility: file.visibility,
          ownerId: file.created_by,
        };
      }

      // Controllo permessi basato su visibilità
      switch (file.visibility) {
        case 'public':
          return {
            canDownload: true,
            visibility: 'public',
            ownerId: file.created_by,
          };

        case 'company':
          // Tutti gli utenti della stessa azienda possono scaricare
          return {
            canDownload: true,
            visibility: 'company',
            ownerId: file.created_by,
          };

        case 'private':
          // Solo il proprietario può scaricare
          if (file.created_by === userId) {
            return {
              canDownload: true,
              visibility: 'private',
              ownerId: file.created_by,
            };
          } else {
            return {
              canDownload: false,
              reason: 'Accesso negato: file privato',
              visibility: 'private',
              ownerId: file.created_by,
            };
          }

        default:
          return {
            canDownload: false,
            reason: 'Visibilità file non valida',
            visibility: file.visibility,
            ownerId: file.created_by,
          };
      }
    } catch (error) {
      console.error('Errore nel controllo permessi download:', error);
      return {
        canDownload: false,
        reason: 'Errore nel controllo permessi',
        visibility: 'unknown',
        ownerId: '',
      };
    }
  }

  /**
   * Genera URL download per file
   */
  async generateDownloadUrl(
    fileId: string,
    userId: string,
    companyId: string
  ): Promise<DownloadResponse> {
    try {
      // Verifica permessi
      const permission = await this.checkDownloadPermission(fileId, userId, companyId);
      if (!permission.canDownload) {
        throw new Error(permission.reason || 'Accesso negato');
      }

      // Ottieni informazioni file
      const file = await fileService.getFileById(fileId, companyId);
      if (!file) {
        throw new Error('File non trovato');
      }

      // Genera presigned URL per download
      const downloadUrl = await fileService.generateDownloadUrl(
        file.s3_key,
        this.downloadUrlExpiry
      );

      // Calcola scadenza
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + this.downloadUrlExpiry);

      // Aggiorna statistiche accesso se abilitato
      if (this.enableAccessTracking) {
        await fileService.updateFileAccessStats(fileId);
      }

      return {
        fileId: file.id,
        downloadUrl,
        filename: file.original_filename,
        mimeType: file.mime_type,
        fileSize: file.file_size,
        expiresAt,
        metadata: file.metadata,
      };
    } catch (error) {
      console.error('Errore nella generazione URL download:', error);
      throw error;
    }
  }

  /**
   * Genera URL download multipli
   */
  async generateMultipleDownloadUrls(
    fileIds: string[],
    userId: string,
    companyId: string
  ): Promise<DownloadResponse[]> {
    try {
      const downloadPromises = fileIds.map(fileId => 
        this.generateDownloadUrl(fileId, userId, companyId)
      );

      return await Promise.all(downloadPromises);
    } catch (error) {
      console.error('Errore nella generazione URL download multipli:', error);
      throw error;
    }
  }

  /**
   * Ottiene dati preview file (senza URL download)
   */
  async getFilePreview(
    fileId: string,
    userId: string,
    companyId: string
  ): Promise<FilePreviewData> {
    try {
      // Verifica permessi di visualizzazione (più permissivi del download)
      const permission = await this.checkViewPermission(fileId, userId, companyId);
      if (!permission.canView) {
        throw new Error(permission.reason || 'Accesso negato');
      }

      // Ottieni informazioni file
      const file = await fileService.getFileById(fileId, companyId);
      if (!file) {
        throw new Error('File non trovato');
      }

      return {
        fileId: file.id,
        filename: file.original_filename,
        mimeType: file.mime_type,
        fileSize: file.file_size,
        thumbnailUrl: file.thumbnail_url,
        previewUrl: file.preview_url,
        metadata: file.metadata,
      };
    } catch (error) {
      console.error('Errore nel recupero preview file:', error);
      throw error;
    }
  }

  /**
   * Verifica permessi di visualizzazione (più permissivi del download)
   */
  private async checkViewPermission(
    fileId: string,
    userId: string,
    companyId: string
  ): Promise<{ canView: boolean; reason?: string }> {
    try {
      const file = await fileService.getFileById(fileId, companyId);
      if (!file) {
        return { canView: false, reason: 'File non trovato' };
      }

      // File pubblici sempre visibili
      if (file.visibility === 'public') {
        return { canView: true };
      }

      // File aziendali visibili a tutti gli utenti dell'azienda
      if (file.visibility === 'company') {
        return { canView: true };
      }

      // File privati visibili solo al proprietario
      if (file.visibility === 'private') {
        return {
          canView: file.created_by === userId,
          reason: file.created_by === userId ? undefined : 'File privato'
        };
      }

      return { canView: false, reason: 'Visibilità non valida' };
    } catch (error) {
      console.error('Errore nel controllo permessi visualizzazione:', error);
      return { canView: false, reason: 'Errore nel controllo permessi' };
    }
  }

  /**
   * Ottiene lista file per entità con permessi
   */
  async getEntityFiles(
    entityType: string,
    entityId: string,
    userId: string,
    companyId: string
  ): Promise<FilePreviewData[]> {
    try {
      // Cerca file associati all'entità
      const searchParams = {
        companyId,
        entityType,
        entityId,
        status: 'active',
      };

      const { files } = await fileService.searchFiles(searchParams);
      
      // Filtra per permessi di visualizzazione
      const accessibleFiles: FilePreviewData[] = [];

      for (const file of files) {
        try {
          const preview = await this.getFilePreview(file.id, userId, companyId);
          accessibleFiles.push(preview);
        } catch (error) {
          // Salta file non accessibili
          console.log(`File ${file.id} non accessibile per utente ${userId}`);
        }
      }

      return accessibleFiles;
    } catch (error) {
      console.error('Errore nel recupero file entità:', error);
      throw new Error('Impossibile recuperare file entità');
    }
  }

  /**
   * Ottiene statistiche download per tenant
   */
  async getDownloadStats(companyId: string): Promise<any> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_downloads,
          COUNT(DISTINCT file_id) as unique_files_downloaded,
          COUNT(DISTINCT user_id) as unique_users_downloading,
          AVG(access_count) as avg_access_per_file,
          MAX(last_accessed_at) as last_download
        FROM file_attachments 
        WHERE company_id = $1 
        AND status = 'active'
        AND access_count > 0
      `;
      
      const result = await db.query(query, [companyId]);
      const stats = result.rows[0];

      return {
        totalDownloads: parseInt(stats.total_downloads || '0'),
        uniqueFilesDownloaded: parseInt(stats.unique_files_downloaded || '0'),
        uniqueUsersDownloading: parseInt(stats.unique_users_downloading || '0'),
        avgAccessPerFile: parseFloat(stats.avg_access_per_file || '0'),
        lastDownload: stats.last_download,
        downloadUrlExpiry: this.downloadUrlExpiry,
        enableAccessTracking: this.enableAccessTracking,
      };
    } catch (error) {
      console.error('Errore nel recupero statistiche download:', error);
      throw new Error('Impossibile recuperare statistiche download');
    }
  }

  /**
   * Verifica integrità file (hash)
   */
  async verifyFileIntegrity(fileId: string, companyId: string): Promise<boolean> {
    try {
      const file = await fileService.getFileById(fileId, companyId);
      if (!file) {
        throw new Error('File non trovato');
      }

      // Verifica che file esista su S3
      const existsOnS3 = await fileService.checkS3FileExists(file.s3_key);
      if (!existsOnS3) {
        return false;
      }

      // TODO: Implementare verifica hash file se necessario
      // Per ora restituiamo true se il file esiste su S3
      return true;
    } catch (error) {
      console.error('Errore nella verifica integrità file:', error);
      return false;
    }
  }

  /**
   * Ottiene file recenti per utente
   */
  async getRecentFiles(
    userId: string,
    companyId: string,
    limit: number = 10
  ): Promise<FilePreviewData[]> {
    try {
      const query = `
        SELECT * FROM file_attachments 
        WHERE company_id = $1 
        AND created_by = $2 
        AND status = 'active'
        ORDER BY created_at DESC
        LIMIT $3
      `;
      
      const result = await db.query(query, [companyId, userId, limit]);
      
      // Converte in formato preview
      const previews: FilePreviewData[] = [];
      for (const file of result.rows) {
        try {
          const preview = await this.getFilePreview(file.id, userId, companyId);
          previews.push(preview);
        } catch (error) {
          // Salta file non accessibili
        }
      }

      return previews;
    } catch (error) {
      console.error('Errore nel recupero file recenti:', error);
      throw new Error('Impossibile recuperare file recenti');
    }
  }

  /**
   * Ottiene file condivi con utente
   */
  async getSharedFiles(
    userId: string,
    companyId: string,
    limit: number = 20
  ): Promise<FilePreviewData[]> {
    try {
      const query = `
        SELECT * FROM file_attachments 
        WHERE company_id = $1 
        AND status = 'active'
        AND (
          visibility = 'company' OR 
          visibility = 'public' OR
          (visibility = 'private' AND shared_with @> $2)
        )
        ORDER BY created_at DESC
        LIMIT $3
      `;
      
      const result = await db.query(query, [
        companyId, 
        JSON.stringify([userId]), 
        limit
      ]);
      
      // Filtra per permessi effettivi
      const accessibleFiles: FilePreviewData[] = [];
      for (const file of result.rows) {
        try {
          const preview = await this.getFilePreview(file.id, userId, companyId);
          accessibleFiles.push(preview);
        } catch (error) {
          // Salta file non accessibili
        }
      }

      return accessibleFiles;
    } catch (error) {
      console.error('Errore nel recupero file condivisi:', error);
      throw new Error('Impossibile recuperare file condivisi');
    }
  }
}

// Esporta istanza singleton
export const downloadService = new DownloadService();
