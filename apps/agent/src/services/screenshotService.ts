import { desktopCapturer, nativeImage } from 'electron';
import { apiClient } from './apiClient';

export class ScreenshotService {
  /**
   * Captures screen thumbnail, applies optional blur, and uploads directly to MinIO/S3 via presigned PUT URL
   */
  public async captureAndUpload(isBlurEnabled: boolean = false): Promise<any> {
    try {
      console.log('[ScreenshotService] Capturing desktop screen...');
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1280, height: 720 },
      });

      if (!sources || sources.length === 0) {
        throw new Error('No screen sources found for desktop capture.');
      }

      let image: any = sources[0].thumbnail;

      // Apply blur if active policy mandates blurring
      if (isBlurEnabled) {
        image = this.applyBlur(image);
      }

      const jpegBuffer = image.toJPEG(75);
      const filename = `screenshot_${Date.now()}.jpg`;

      console.log('[ScreenshotService] Requesting presigned URL from API...');
      const presignRes = await apiClient.requestPresignedScreenshotUrl(filename, 'image/jpeg');

      const s3Key = presignRes.s3Key || presignRes.key;
      const uploadUrl = presignRes.uploadUrl;

      if (!uploadUrl || !s3Key) {
        throw new Error(`Invalid presigned response from API: ${JSON.stringify(presignRes)}`);
      }

      console.log(`[ScreenshotService] Uploading binary directly to S3/MinIO URL: ${uploadUrl}`);
      await apiClient.uploadScreenshotToS3(uploadUrl, jpegBuffer, 'image/jpeg');

      const capturedAt = new Date().toISOString();
      console.log(`[ScreenshotService] Confirming screenshot upload for key: ${s3Key}`);
      const confirmed = await apiClient.confirmScreenshot(s3Key, capturedAt, 85, isBlurEnabled);

      return confirmed;
    } catch (err: any) {
      console.error('[ScreenshotService] Capture and upload failed:', err.message || err);
      throw err;
    }
  }

  /**
   * Helper to resize/blur native image if blur policy is active
   */
  private applyBlur(image: any): any {
    try {
      // Downscale to 80x45 then upscale to create heavy pixelation/blur effect
      const tiny = image.resize({ width: 80, height: 45, quality: 'better' });
      return tiny.resize({ width: 1280, height: 720, quality: 'good' });
    } catch (e) {
      return image;
    }
  }
}

export const screenshotService = new ScreenshotService();
