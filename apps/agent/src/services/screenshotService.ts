import { desktopCapturer, nativeImage, app } from 'electron';
import { apiClient } from './apiClient';
import * as path from 'path';
import * as fs from 'fs';

// Try loading native screenshot-desktop library (immune to Chromium thread 170 blank screen bug)
let screenshotLib: any = null;
try {
  screenshotLib = require('screenshot-desktop');
} catch (e) {
  console.warn('[ScreenshotService] Native screenshot module fallback to desktopCapturer');
}

export class ScreenshotService {
  /**
   * Captures real screen pixels, applies optional blur, and uploads directly to MinIO/S3 via presigned PUT URL
   */
  public async captureAndUpload(isBlurEnabled: boolean = false): Promise<any> {
    try {
      console.log('[ScreenshotService] Capturing desktop screen...');
      let jpegBuffer = await this.captureScreenBuffer();

      if (!jpegBuffer || jpegBuffer.length === 0) {
        throw new Error('Screen capture returned an empty buffer');
      }

      // Apply blur if active policy mandates blurring
      if (isBlurEnabled) {
        try {
          const image = nativeImage.createFromBuffer(jpegBuffer);
          const blurred = this.applyBlur(image);
          jpegBuffer = blurred.toJPEG(75);
        } catch (blurErr) {
          console.warn('[ScreenshotService] Blur transformation fallback:', blurErr);
        }
      }

      // Save a local copy in userData for instant inspection/debug
      try {
        const cacheDir = path.join(app.getPath('userData'), 'screenshots');
        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
        fs.writeFileSync(path.join(cacheDir, 'last_capture.jpg'), jpegBuffer);
      } catch (_) {}

      console.log(`[ScreenshotService] Uploading screenshot (${jpegBuffer.length} bytes) to API...`);
      try {
        const res = await apiClient.uploadScreenshotDirect(
          jpegBuffer,
          new Date().toISOString(),
          85,
          isBlurEnabled
        );
        console.log('[ScreenshotService] Screenshot saved successfully:', res.screenshot?._id);
        return res;
      } catch (uploadErr: any) {
        console.warn('[ScreenshotService] Online upload failed (offline / network error):', uploadErr.message);

        // Save locally in pending_screenshots with isSync: false flag
        try {
          const offlineId = `sc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
          const pendingDir = path.join(app.getPath('userData'), 'pending_screenshots');
          if (!fs.existsSync(pendingDir)) fs.mkdirSync(pendingDir, { recursive: true });
          const filePath = path.join(pendingDir, `${offlineId}.jpg`);
          fs.writeFileSync(filePath, jpegBuffer);

          const { localQueue } = require('./sqliteQueue');
          localQueue.enqueueScreenshot({
            id: offlineId,
            filePath,
            capturedAt: new Date().toISOString(),
            activityScore: 85,
            isBlurred: isBlurEnabled,
            isSync: false,
          });

          console.log(`[ScreenshotService] Saved offline screenshot locally (isSync: false): ${filePath}`);
          return { success: true, offline: true, id: offlineId };
        } catch (queueErr: any) {
          console.error('[ScreenshotService] Could not save offline screenshot locally:', queueErr);
          throw uploadErr;
        }
      }
    } catch (err: any) {
      console.error('[ScreenshotService] Capture and upload failed:', err.message || err);
      throw err;
    }
  }

  /**
   * Captures screen buffer using native screenshot-desktop driver with fallback to desktopCapturer
   */
  private async captureScreenBuffer(): Promise<Buffer> {
    if (screenshotLib) {
      try {
        const buf: Buffer = await screenshotLib({ format: 'jpg' });
        if (buf && buf.length > 500) {
          console.log(`[ScreenshotService] Native screen captured successfully (${buf.length} bytes, crisp JPEG)`);
          return buf;
        }
      } catch (nativeErr: any) {
        console.warn('[ScreenshotService] Native screenshotLib capture error, using desktopCapturer:', nativeErr.message);
      }
    }

    // Fallback: desktopCapturer
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 },
    });

    if (!sources || sources.length === 0) {
      throw new Error('No screen sources found for desktop capture.');
    }

    const validSource = sources.find(s => !s.thumbnail.isEmpty()) || sources[0];
    return validSource.thumbnail.toJPEG(75);
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
