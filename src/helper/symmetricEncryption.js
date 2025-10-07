import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.URL_ENCRYPTION_KEY || '32_characters_long_secret!';
const IV_LENGTH = 16; // For AES, this is always 16

export function encrypt(text) {
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(text) {
    let [ivHex, encrypted] = text.split(':');
    let iv = Buffer.from(ivHex, 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
