export class CameraManager {
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private isStreaming: boolean = false;
  private isDestroyed: boolean = false;

  constructor() {
    this.ensureVideoElement();
  }

  private ensureVideoElement(): HTMLVideoElement {
    if (!this.videoElement) {
      this.videoElement = document.createElement('video');
      this.videoElement.setAttribute('playsinline', '');
      this.videoElement.setAttribute('autoplay', '');
      this.videoElement.muted = true;
      this.videoElement.style.display = 'none';
      document.body.appendChild(this.videoElement);
    }
    return this.videoElement;
  }

  public async startCamera(width = 640, height = 480): Promise<HTMLVideoElement> {
    this.isDestroyed = false;

    if (this.stream && this.isStreaming && this.videoElement) {
      return this.videoElement;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Webcam access is not supported by your browser.');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: width },
          height: { ideal: height },
          facingMode: 'user',
          frameRate: { ideal: 60, max: 60 },
        },
        audio: false,
      });

      if (this.isDestroyed) {
        // Stream resolved after destroy was called; clean up and abort
        stream.getTracks().forEach((track) => track.stop());
        throw new Error('CameraManager was destroyed before stream completed.');
      }

      this.stream = stream;
      const videoEl = this.ensureVideoElement();
      videoEl.srcObject = this.stream;

      await new Promise<void>((resolve, reject) => {
        if (!this.videoElement || this.isDestroyed) {
          return reject(new Error('No video element available'));
        }

        this.videoElement.onloadedmetadata = () => {
          if (!this.videoElement || this.isDestroyed) return resolve();
          this.videoElement.play()
            .then(() => {
              this.isStreaming = true;
              resolve();
            })
            .catch(reject);
        };
        this.videoElement.onerror = (e) => reject(e);
      });

      return videoEl;
    } catch (err: any) {
      if (this.isDestroyed || err.message?.includes('destroyed')) {
        // Silently handle cancelled initialization during unmount
        return this.videoElement || document.createElement('video');
      }

      this.stopCamera();
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('Camera permission denied. Please allow webcam access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        throw new Error('No webcam found on your device.');
      } else {
        throw new Error(`Webcam error: ${err.message || 'Unable to access camera'}`);
      }
    }
  }

  public stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    this.isStreaming = false;
  }

  public getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }

  public isActive(): boolean {
    return this.isStreaming && !!this.videoElement && this.videoElement.readyState >= 2;
  }

  public destroy(): void {
    this.isDestroyed = true;
    this.stopCamera();
    if (this.videoElement && this.videoElement.parentNode) {
      this.videoElement.parentNode.removeChild(this.videoElement);
      this.videoElement = null;
    }
  }
}

