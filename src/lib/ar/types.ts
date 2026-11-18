import type * as THREE from "three";
export type Point3 = { x: number; y: number; z: number };
export type Rotation = Point3 & { w: number };
export type WorldPoint = { id?: number; confidence: number; position: Point3 };
export type Reality = {
  trackingStatus?: string;
  trackingReason?: string;
  position?: Point3;
  rotation?: Rotation;
  worldPoints?: WorldPoint[];
};
export type Hit = {
  type: string;
  position: Point3;
  rotation?: Rotation;
  distance?: number;
};
export type Placement = {
  position: Point3;
  normal: Point3;
  source: "engine-surface" | "slam-point-cloud";
  updatedAt: number;
  support: number;
};
export type XrScene = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
};
export type CameraUpdate = { status: string; stream?: MediaStream };
export type Pipeline = {
  name: string;
  onStart?: (event: { canvas: HTMLCanvasElement }) => void;
  onUpdate?: (event: { processCpuResult?: { reality?: Reality } }) => void;
  onCameraStatusChange?: (event: CameraUpdate) => void;
  onException?: (error: unknown) => void;
};
export type XR8Engine = {
  initialize: () => Promise<void>;
  loadChunk: (chunk: "slam") => Promise<void>;
  run: (options: {
    canvas: HTMLCanvasElement;
    cameraConfig: { direction: string };
    allowedDevices: string;
    glContextConfig?: WebGLContextAttributes;
  }) => void | Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  clearCameraPipelineModules: () => void;
  addCameraPipelineModules: (modules: Pipeline[]) => void;
  XrConfig: {
    camera: () => { BACK: string };
    device: () => { MOBILE: string };
  };
  XrDevice: {
    isDeviceBrowserCompatible: (options: { allowedDevices: string }) => boolean;
  };
  GlTextureRenderer: { pipelineModule: () => Pipeline };
  Threejs: { pipelineModule: () => Pipeline; xrScene: () => XrScene };
  XrController: {
    configure: (options: {
      disableWorldTracking: boolean;
      enableWorldPoints: boolean;
      scale: "absolute";
    }) => void;
    pipelineModule: () => Pipeline;
    updateCameraProjectionMatrix: (options: {
      origin: THREE.Vector3;
      facing: THREE.Quaternion;
    }) => void;
    hitTest: (x: number, y: number) => Hit[];
  };
};
export type ARSnapshot = {
  state:
    | "INITIALIZING"
    | "SEARCHING"
    | "READY"
    | "PLACED"
    | "TRACKING_LOST"
    | "ERROR"
    | "UNSUPPORTED";
  placed: boolean;
  tracking: boolean;
  canPlace: boolean;
  error: string | null;
  source: string;
};
declare global {
  interface Window {
    XR8?: XR8Engine;
    THREE?: typeof THREE;
  }
}
