import dotenv from 'dotenv';

// Carica le variabili d'ambiente
dotenv.config();

// Interfaccia per configurazione S3
export interface S3Config {
  bucket: {
    name: string;
    region: string;
    encryption: string;
    versioning: boolean;
    cors: boolean;
  };
  iam: {
    roleArn: string;
    region: string;
  };
  upload: {
    maxFileSize: string;
    allowedMimeTypes: string[];
    expirySeconds: number;
    presignedUrlExpiry: number;
  };
  security: {
    encryptionAlgorithm: string;
    bucketKeyEnabled: boolean;
    intelligentTiering: boolean;
  };
  lifecycle: {
    enabled: boolean;
    archiveAfterDays: number;
    glacierAfterDays: number;
    deleteAfterDays: number;
  };
  monitoring: {
    cloudWatchEnabled: boolean;
    dashboardName: string;
    metricsEnabled: boolean;
  };
}

// Configurazione S3 per ambiente
const getS3Config = (): S3Config => {
  const environment = process.env.NODE_ENV || 'development';
  
  // Configurazione base per tutti gli ambienti
  const baseConfig: S3Config = {
    bucket: {
      name: process.env.S3_BUCKET_NAME || `miosaas-files-${environment}`,
      region: process.env.S3_REGION || 'eu-north-1',
      encryption: process.env.S3_ENCRYPTION || 'AES256',
      versioning: true,
      cors: true,
    },
    iam: {
      roleArn: process.env.AWS_ROLE_ARN || '',
      region: process.env.AWS_REGION || 'eu-north-1',
    },
    upload: {
      maxFileSize: process.env.MAX_FILE_SIZE || '100MB',
      allowedMimeTypes: (process.env.ALLOWED_MIME_TYPES || 'image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document').split(','),
      expirySeconds: parseInt(process.env.UPLOAD_EXPIRY_SECONDS || '3600'),
      presignedUrlExpiry: parseInt(process.env.PRESIGNED_URL_EXPIRY || '3600'),
    },
    security: {
      encryptionAlgorithm: 'AES256',
      bucketKeyEnabled: true,
      intelligentTiering: true,
    },
    lifecycle: {
      enabled: true,
      archiveAfterDays: 90,
      glacierAfterDays: 365,
      deleteAfterDays: 2555,
    },
    monitoring: {
      cloudWatchEnabled: true,
      dashboardName: `MioSaaS-S3-Monitoring-${environment}`,
      metricsEnabled: true,
    },
  };

  // Configurazioni specifiche per ambiente
  switch (environment) {
    case 'production':
      return {
        ...baseConfig,
        upload: {
          ...baseConfig.upload,
          maxFileSize: '500MB',
          expirySeconds: 1800, // 30 minuti per produzione
        },
        security: {
          ...baseConfig.security,
          bucketKeyEnabled: true,
        },
        monitoring: {
          ...baseConfig.monitoring,
          cloudWatchEnabled: true,
          metricsEnabled: true,
        },
      };
    
    case 'staging':
      return {
        ...baseConfig,
        upload: {
          ...baseConfig.upload,
          maxFileSize: '200MB',
          expirySeconds: 7200, // 2 ore per staging
        },
        monitoring: {
          ...baseConfig.monitoring,
          cloudWatchEnabled: true,
          metricsEnabled: true,
        },
      };
    
    case 'development':
    default:
      return {
        ...baseConfig,
        upload: {
          ...baseConfig.upload,
          maxFileSize: '100MB',
          expirySeconds: 7200, // 2 ore per sviluppo
        },
        monitoring: {
          ...baseConfig.monitoring,
          cloudWatchEnabled: false,
          metricsEnabled: false,
        },
      };
  }
};

// Configurazione S3
export const s3Config: S3Config = getS3Config();

// Validazione configurazione
export const validateS3Config = (): void => {
  const errors: string[] = [];

  if (!s3Config.bucket.name) {
    errors.push('S3_BUCKET_NAME non configurato');
  }

  if (!s3Config.bucket.region) {
    errors.push('S3_REGION non configurato');
  }

  if (!s3Config.iam.roleArn) {
    errors.push('AWS_ROLE_ARN non configurato');
  }

  if (s3Config.upload.expirySeconds <= 0) {
    errors.push('UPLOAD_EXPIRY_SECONDS deve essere maggiore di 0');
  }

  if (s3Config.upload.presignedUrlExpiry <= 0) {
    errors.push('PRESIGNED_URL_EXPIRY deve essere maggiore di 0');
  }

  if (errors.length > 0) {
    throw new Error(`Configurazione S3 non valida: ${errors.join(', ')}`);
  }
};

// Utility per parsing dimensioni file
export const parseFileSize = (sizeString: string): number => {
  const units: { [key: string]: number } = {
    'B': 1,
    'KB': 1024,
    'MB': 1024 * 1024,
    'GB': 1024 * 1024 * 1024,
    'TB': 1024 * 1024 * 1024 * 1024,
  };

  const match = sizeString.match(/^(\d+(?:\.\d+)?)\s*([KMGT]?B)$/i);
  if (!match) {
    throw new Error(`Formato dimensione file non valido: ${sizeString}`);
  }

  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  
  return value * (units[unit] || 1);
};

// Utility per validazione MIME type
export const isValidMimeType = (mimeType: string): boolean => {
  const allowedPatterns = s3Config.upload.allowedMimeTypes.map(pattern => {
    if (pattern.includes('*')) {
      // Converti pattern wildcard in regex
      const regexPattern = pattern.replace(/\*/g, '.*');
      return new RegExp(`^${regexPattern}$`, 'i');
    }
    return new RegExp(`^${pattern}$`, 'i');
  });

  return allowedPatterns.some(pattern => pattern.test(mimeType));
};

// Utility per generazione chiavi S3
export const generateS3Key = (params: {
  companyId: string;
  section: 'commesse' | 'rapportini' | 'documenti' | 'costi' | 'ricavi';
  category: string;
  entityId?: string;
  filename: string;
  timestamp?: Date;
}): string => {
  const { companyId, section, category, entityId, filename, timestamp } = params;
  
  const date = timestamp || new Date();
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  
  let key = `${companyId}/${section}/${category}`;
  
  if (entityId) {
    key += `/${entityId}`;
  }
  
  // Aggiungi timestamp per evitare conflitti
  const timestampStr = date.getTime();
  const fileExtension = filename.includes('.') ? filename.substring(filename.lastIndexOf('.')) : '';
  const fileNameWithoutExt = filename.includes('.') ? filename.substring(0, filename.lastIndexOf('.')) : filename;
  
  key += `/${fileNameWithoutExt}_${timestampStr}${fileExtension}`;
  
  return key;
};

// Utility per parsing chiavi S3
export const parseS3Key = (key: string): {
  companyId: string;
  section: string;
  category: string;
  entityId?: string;
  filename: string;
} => {
  const parts = key.split('/');
  
  if (parts.length < 4) {
    throw new Error(`Chiave S3 non valida: ${key}`);
  }
  
  const [companyId, section, category, ...remaining] = parts;
  
  let entityId: string | undefined;
  let filename: string;
  
  if (remaining.length > 1) {
    entityId = remaining[0];
    filename = remaining.slice(1).join('/');
  } else {
    filename = remaining[0];
  }
  
  return {
    companyId,
    section,
    category,
    entityId,
    filename,
  };
};

// Utility per validazione sezioni
export const isValidSection = (section: string): boolean => {
  const validSections = ['commesse', 'rapportini', 'documenti', 'costi', 'ricavi'];
  return validSections.includes(section);
};

// Utility per validazione categorie per sezione
export const getValidCategoriesForSection = (section: string): string[] => {
  const categoryMap: { [key: string]: string[] } = {
    commesse: ['contratti', 'fatture', 'foto', 'documenti', 'preventivi', 'relazioni'],
    rapportini: ['foto', 'allegati', 'documenti', 'note'],
    documenti: ['contratti', 'preventivi', 'amministrativi', 'tecnici', 'commerciali'],
    costi: ['fatture', 'ricevute', 'documenti', 'contratti'],
    ricavi: ['fatture', 'documenti', 'contratti', 'preventivi'],
  };
  
  return categoryMap[section] || [];
};

// Utility per validazione categoria
export const isValidCategoryForSection = (section: string, category: string): boolean => {
  const validCategories = getValidCategoriesForSection(section);
  return validCategories.includes(category);
};

// Esporta configurazione validata
export default s3Config;
