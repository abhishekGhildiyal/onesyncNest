import { Injectable } from '@nestjs/common';

const CLOUDINARY_BASE_URL = 'res.cloudinary.com';

@Injectable()
export class CloudinaryService {
  private getCloudName() {
    return process.env.CLOUDINARY_CLOUD_NAME || '';
  }

  isCloudinaryUrl(urlString: string) {
    if (!urlString || typeof urlString !== 'string') return false;

    try {
      const url = new URL(urlString);
      if (url.host !== CLOUDINARY_BASE_URL) return false;

      const cloudName = this.getCloudName();
      if (!cloudName) return url.pathname.includes('/image/upload/');

      const regex = new RegExp(
        `^https?://res\\.cloudinary\\.com/${cloudName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/image/upload/.*$`,
      );
      return regex.test(urlString);
    } catch {
      return false;
    }
  }

  async uploadImageFromUrl(imageUrl: string) {
    const apiUrl = process.env.CLOUDINARY_API_URL;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

    if (!apiUrl || !uploadPreset || !imageUrl) return imageUrl;

    try {
      const params = new URLSearchParams({
        upload_preset: uploadPreset,
        file: imageUrl,
      });

      const response = await fetch(`${apiUrl}?${params.toString()}`, { method: 'POST' });
      if (!response.ok) return imageUrl;

      const body = await response.json();
      return body?.secure_url || imageUrl;
    } catch (err: any) {
      console.warn('[Cloudinary] upload failed:', err.message);
      return imageUrl;
    }
  }

  async normalizeProductImages(image: string) {
    if (!image) return '';

    const parts = String(image)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (!parts.length) return '';

    const normalized = await Promise.all(
      parts.map(async (img) => (this.isCloudinaryUrl(img) ? img : this.uploadImageFromUrl(img))),
    );

    return normalized.filter(Boolean).join(',');
  }
}
