import * as vscode from 'vscode';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/logger';

export interface SecureCredential {
  id: string;
  service: string;
  encrypted: string;
  iv: string;
  createdAt: Date;
  lastUsed?: Date;
}

export interface SecurityConfig {
  encryptionEnabled: boolean;
  keyRotationDays: number;
  auditLogEnabled: boolean;
  redactSensitiveData: boolean;
  allowedDomains: string[];
  maxRetries: number;
}

export class SecurityManager {
  private logger: Logger;
  private encryptionKey: Buffer;
  private credentials: Map<string, SecureCredential> = new Map();
  private auditLog: Array<{ timestamp: Date; action: string; service: string; success: boolean }> = [];
  private config: SecurityConfig;

  constructor() {
    this.logger = new Logger('SecurityManager');
    this.config = this.loadSecurityConfig();
    this.encryptionKey = this.generateOrLoadEncryptionKey();
    this.loadStoredCredentials();
  }

  private loadSecurityConfig(): SecurityConfig {
    const config = vscode.workspace.getConfiguration('cline.security');
    return {
      encryptionEnabled: config.get('encryptionEnabled', true),
      keyRotationDays: config.get('keyRotationDays', 30),
      auditLogEnabled: config.get('auditLogEnabled', true),
      redactSensitiveData: config.get('redactSensitiveData', true),
      allowedDomains: config.get('allowedDomains', ['api.openai.com', 'api.anthropic.com', 'api.cohere.ai']),
      maxRetries: config.get('maxRetries', 3)
    };
  }

  private generateOrLoadEncryptionKey(): Buffer {
    const keyPath = path.join(this.getSecureStoragePath(), 'encryption.key');
    
    if (fs.existsSync(keyPath)) {
      try {
        return fs.readFileSync(keyPath);
      } catch (error) {
        this.logger.warn('Failed to load encryption key, generating new one');
      }
    }

    // Generate new key
    const key = crypto.randomBytes(32);
    try {
      fs.mkdirSync(path.dirname(keyPath), { recursive: true });
      fs.writeFileSync(keyPath, key, { mode: 0o600 });
    } catch (error) {
      this.logger.error('Failed to save encryption key', error);
    }

    return key;
  }

  private getSecureStoragePath(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    return path.join(homeDir, '.cline', 'secure');
  }

  private loadStoredCredentials(): void {
    const credentialsPath = path.join(this.getSecureStoragePath(), 'credentials.json');
    
    if (!fs.existsSync(credentialsPath)) {
      return;
    }

    try {
      const data = fs.readFileSync(credentialsPath, 'utf8');
      const stored = JSON.parse(data);
      
      for (const cred of stored) {
        this.credentials.set(cred.id, {
          ...cred,
          createdAt: new Date(cred.createdAt),
          lastUsed: cred.lastUsed ? new Date(cred.lastUsed) : undefined
        });
      }
      
      this.logger.info(`Loaded ${this.credentials.size} stored credentials`);
    } catch (error) {
      this.logger.error('Failed to load stored credentials', error);
    }
  }

  private saveCredentials(): void {
    const credentialsPath = path.join(this.getSecureStoragePath(), 'credentials.json');
    
    try {
      fs.mkdirSync(path.dirname(credentialsPath), { recursive: true });
      const data = Array.from(this.credentials.values());
      fs.writeFileSync(credentialsPath, JSON.stringify(data, null, 2), { mode: 0o600 });
    } catch (error) {
      this.logger.error('Failed to save credentials', error);
    }
  }

  public encrypt(data: string): { encrypted: string; iv: string } {
    if (!this.config.encryptionEnabled) {
      return { encrypted: data, iv: '' };
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    cipher.setAutoPadding(true);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex')
    };
  }

  public decrypt(encrypted: string, iv: string): string {
    if (!this.config.encryptionEnabled || !iv) {
      return encrypted;
    }

    try {
      const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      this.logger.error('Failed to decrypt data', error);
      throw new Error('Decryption failed');
    }
  }

  public storeCredential(service: string, credential: string): string {
    const id = crypto.randomUUID();
    const { encrypted, iv } = this.encrypt(credential);
    
    const secureCredential: SecureCredential = {
      id,
      service,
      encrypted,
      iv,
      createdAt: new Date()
    };
    
    this.credentials.set(id, secureCredential);
    this.saveCredentials();
    
    this.auditLog.push({
      timestamp: new Date(),
      action: 'store_credential',
      service,
      success: true
    });
    
    this.logger.info(`Stored credential for service: ${service}`);
    return id;
  }

  public getCredential(id: string): string | null {
    const credential = this.credentials.get(id);
    if (!credential) {
      this.auditLog.push({
        timestamp: new Date(),
        action: 'get_credential',
        service: 'unknown',
        success: false
      });
      return null;
    }

    try {
      const decrypted = this.decrypt(credential.encrypted, credential.iv);
      
      // Update last used
      credential.lastUsed = new Date();
      this.saveCredentials();
      
      this.auditLog.push({
        timestamp: new Date(),
        action: 'get_credential',
        service: credential.service,
        success: true
      });
      
      return decrypted;
    } catch (error) {
      this.auditLog.push({
        timestamp: new Date(),
        action: 'get_credential',
        service: credential.service,
        success: false
      });
      return null;
    }
  }

  public deleteCredential(id: string): boolean {
    const credential = this.credentials.get(id);
    if (!credential) {
      return false;
    }

    this.credentials.delete(id);
    this.saveCredentials();
    
    this.auditLog.push({
      timestamp: new Date(),
      action: 'delete_credential',
      service: credential.service,
      success: true
    });
    
    this.logger.info(`Deleted credential for service: ${credential.service}`);
    return true;
  }

  public listCredentials(): Array<{ id: string; service: string; createdAt: Date; lastUsed?: Date }> {
    return Array.from(this.credentials.values()).map(cred => ({
      id: cred.id,
      service: cred.service,
      createdAt: cred.createdAt,
      lastUsed: cred.lastUsed
    }));
  }

  public redactSensitiveData(text: string): string {
    if (!this.config.redactSensitiveData) {
      return text;
    }

    // Redact common sensitive patterns
    let redacted = text;
    
    // API keys
    redacted = redacted.replace(/sk-[a-zA-Z0-9]{48}/g, 'sk-***REDACTED***');
    redacted = redacted.replace(/pk-[a-zA-Z0-9]{48}/g, 'pk-***REDACTED***');
    
    // Bearer tokens
    redacted = redacted.replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer ***REDACTED***');
    
    // Basic auth
    redacted = redacted.replace(/Basic\s+[a-zA-Z0-9+/=]+/gi, 'Basic ***REDACTED***');
    
    // Email addresses
    redacted = redacted.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '***EMAIL_REDACTED***');
    
    // Credit card numbers
    redacted = redacted.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '***CARD_REDACTED***');
    
    return redacted;
  }

  public validateDomain(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return this.config.allowedDomains.some(domain => 
        urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
      );
    } catch {
      return false;
    }
  }

  public getAuditLog(): Array<{ timestamp: Date; action: string; service: string; success: boolean }> {
    return [...this.auditLog];
  }

  public clearAuditLog(): void {
    this.auditLog = [];
    this.logger.info('Audit log cleared');
  }

  public rotateEncryptionKey(): void {
    this.logger.info('Starting encryption key rotation');
    
    // Store old key temporarily
    const oldKey = this.encryptionKey;
    
    // Generate new key
    this.encryptionKey = crypto.randomBytes(32);
    
    // Re-encrypt all credentials with new key
    for (const [id, credential] of this.credentials.entries()) {
      try {
        // Decrypt with old key
        const oldDecipher = crypto.createDecipher('aes-256-cbc', oldKey);
        let decrypted = oldDecipher.update(credential.encrypted, 'hex', 'utf8');
        decrypted += oldDecipher.final('utf8');
        
        // Encrypt with new key
        const { encrypted, iv } = this.encrypt(decrypted);
        credential.encrypted = encrypted;
        credential.iv = iv;
      } catch (error) {
        this.logger.error(`Failed to rotate key for credential ${id}`, error);
      }
    }
    
    // Save updated credentials and new key
    this.saveCredentials();
    const keyPath = path.join(this.getSecureStoragePath(), 'encryption.key');
    fs.writeFileSync(keyPath, this.encryptionKey, { mode: 0o600 });
    
    this.logger.info('Encryption key rotation completed');
  }

  public dispose(): void {
    this.saveCredentials();
    this.credentials.clear();
    this.encryptionKey.fill(0); // Clear key from memory
  }
}