// NOTE: This is a placeholder for a real encryption service.
// In a production environment, you should use a robust library like 'crypto'
// and manage your encryption keys securely.

const FAKE_ENCRYPTION_KEY = 'super-secret-key-that-should-be-in-env';

export function encrypt(text: string): string {
  // This is NOT real encryption.
  return Buffer.from(text).toString('base64');
}

export function decrypt(text: string): string {
  // This is NOT real decryption.
  return Buffer.from(text, 'base64').toString('utf8');
} 