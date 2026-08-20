import { FilesetResolver, HandLandmarker, HandLandmarkerResult } from '@mediapipe/tasks-vision';

export interface TrackingData {
  handDetected: boolean;
  confidence: number;
  rawIndexTip: { x: number; y: number } | null;
  rawThumbTip: { x: number; y: number } | null;
  rawWrist: { x: number; y: number } | null;
  landmarks: Array<{ x: number; y: number; z: number }> | null;
}

export class HandTracker {
  private handLandmarker: HandLandmarker | null = null;
  private isInitialized: boolean = false;
  private lastVideoTime: number = -1;

  public async initialize(): Promise<void> {
    if (this.isInitialized && this.handLandmarker) return;

    try {
      // Load MediaPipe vision tasks WASM binaries
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this.isInitialized = true;
    } catch (err: any) {
      console.error('Failed to initialize MediaPipe Hand Landmarker:', err);
      throw new Error(`MediaPipe initialization failed: ${err.message || 'Model loading error'}`);
    }
  }

  public detect(videoElement: HTMLVideoElement, timestamp: number): TrackingData {
    const defaultData: TrackingData = {
      handDetected: false,
      confidence: 0,
      rawIndexTip: null,
      rawThumbTip: null,
      rawWrist: null,
      landmarks: null,
    };

    if (!this.isInitialized || !this.handLandmarker || !videoElement || videoElement.readyState < 2) {
      return defaultData;
    }

    try {
      // Ensure timestamps are monotonically increasing for MediaPipe VIDEO mode
      const videoTime = videoElement.currentTime;
      let frameTimestamp = timestamp;
      if (videoTime === this.lastVideoTime) {
        // Same frame, avoid duplicate processing
        frameTimestamp = performance.now();
      }
      this.lastVideoTime = videoTime;

      const result: HandLandmarkerResult = this.handLandmarker.detectForVideo(videoElement, frameTimestamp);

      if (result.landmarks && result.landmarks.length > 0 && result.landmarks[0].length > 0) {
        const hand = result.landmarks[0];
        const score = result.handedness && result.handedness.length > 0 ? result.handedness[0][0].score : 0.9;

        // Landmark 8: INDEX_FINGER_TIP
        // Landmark 4: THUMB_TIP
        // Landmark 0: WRIST
        const indexTip = hand[8];
        const thumbTip = hand[4];
        const wrist = hand[0];

        return {
          handDetected: true,
          confidence: score,
          rawIndexTip: { x: indexTip.x, y: indexTip.y },
          rawThumbTip: { x: thumbTip.x, y: thumbTip.y },
          rawWrist: { x: wrist.x, y: wrist.y },
          landmarks: hand,
        };
      }
    } catch (err) {
      console.warn('Error during hand detection frame:', err);
    }

    return defaultData;
  }

  public isReady(): boolean {
    return this.isInitialized && !!this.handLandmarker;
  }

  public destroy(): void {
    if (this.handLandmarker) {
      this.handLandmarker.close();
      this.handLandmarker = null;
    }
    this.isInitialized = false;
  }
}
