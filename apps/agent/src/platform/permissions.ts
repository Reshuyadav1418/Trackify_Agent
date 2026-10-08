import * as os from 'os';

export interface PermissionStatus {
  platform: string;
  hasScreenCapturePermission: boolean;
  hasAccessibilityPermission: boolean;
  notes: string[];
}

export class PlatformPermissions {
  public static getPlatform(): string {
    return os.platform();
  }

  public static checkPermissions(): PermissionStatus {
    const platform = this.getPlatform();

    if (platform === 'darwin') {
      return {
        platform: 'macOS',
        hasScreenCapturePermission: true, // macOS system prompt will ask on desktopCapturer
        hasAccessibilityPermission: true,
        notes: [
          'macOS Screen Recording Permission: Required for desktop screenshots. Grant access in System Settings -> Privacy & Security -> Screen Recording.',
          'macOS Accessibility Permission: Required for Global Key & Mouse input event counting. Grant access in System Settings -> Privacy & Security -> Accessibility.',
        ],
      };
    }

    if (platform === 'win32') {
      return {
        platform: 'Windows',
        hasScreenCapturePermission: true,
        hasAccessibilityPermission: true,
        notes: [
          'Windows Administrator Access: Recommended to allow global low-level mouse and keyboard hook registration.',
          'Firewall Rule: Ensure outbound TCP connections to http://localhost:3000 and MinIO S3 (port 9000) are permitted.',
        ],
      };
    }

    // Linux
    return {
      platform: 'Linux',
      hasScreenCapturePermission: true,
      hasAccessibilityPermission: true,
      notes: [
        'Display Server: X11 is fully supported for uiohook and desktopCapturer. Wayland may require pipewire portal permissions.',
      ],
    };
  }
}
