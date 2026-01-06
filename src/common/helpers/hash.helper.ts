import * as CryptoJS from 'crypto-js';

export function generateAlphaNumericPassword(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const symbols = '@#$%&*!';

  const getRandom = (str: string) => str.charAt(Math.floor(Math.random() * str.length));

  // Ensure at least one letter, one digit, and one symbol
  let password = [
    getRandom(letters),
    getRandom(letters),
    getRandom(digits),
    getRandom(digits),
    getRandom(symbols),
    getRandom(letters + digits),
  ];

  // Shuffle to avoid predictable order
  password = password.sort(() => Math.random() - 0.5);

  return password.join('');
}

export function hashPasswordMD5(string: string): string {
  return CryptoJS.MD5(string).toString();
}

export function compareMD5(inputString: string, hashedValue: string): boolean {
  return CryptoJS.MD5(inputString).toString() === hashedValue;
}
