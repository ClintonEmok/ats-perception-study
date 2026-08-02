import * as THREE from 'three';

export type ComparisonCameraPane = 'A' | 'B';
export type CameraVector = [number, number, number];

export interface ComparisonCameraPose {
  position: CameraVector;
  target: CameraVector;
}

export const DEFAULT_COMPARISON_CAMERA_POSE: ComparisonCameraPose = {
  position: [105, 175, 105],
  target: [0, 0, 0],
};

export interface ComparisonCameraControls {
  getPosition: (out: THREE.Vector3, receiveEndValue?: boolean) => THREE.Vector3;
  getTarget: (out: THREE.Vector3, receiveEndValue?: boolean) => THREE.Vector3;
  setLookAt: (
    positionX: number,
    positionY: number,
    positionZ: number,
    targetX: number,
    targetY: number,
    targetZ: number,
    enableTransition?: boolean,
  ) => unknown;
}

export interface ComparisonCameraController {
  isLinked: () => boolean;
  setLinked: (linked: boolean) => void;
  handleUpdate: (source: ComparisonCameraPane) => void;
  snapBToA: () => void;
  reset: () => void;
}

export function readComparisonCameraPose(controls: ComparisonCameraControls): ComparisonCameraPose {
  const position = controls.getPosition(new THREE.Vector3(), false);
  const target = controls.getTarget(new THREE.Vector3(), false);
  return {
    position: [position.x, position.y, position.z],
    target: [target.x, target.y, target.z],
  };
}

export function setComparisonCameraPose(
  controls: ComparisonCameraControls,
  pose: ComparisonCameraPose,
  enableTransition = false,
): void {
  controls.setLookAt(
    pose.position[0],
    pose.position[1],
    pose.position[2],
    pose.target[0],
    pose.target[1],
    pose.target[2],
    enableTransition,
  );
}

export function areComparisonCameraPosesEqual(
  first: ComparisonCameraPose,
  second: ComparisonCameraPose,
  epsilon = 1e-4,
): boolean {
  return first.position.every((value, index) => Math.abs(value - second.position[index]) <= epsilon)
    && first.target.every((value, index) => Math.abs(value - second.target[index]) <= epsilon);
}

export function createComparisonCameraController({
  getControls,
  initialLinked = true,
  resetTransition = true,
  reducedMotion = false,
}: {
  getControls: (pane: ComparisonCameraPane) => ComparisonCameraControls | null;
  initialLinked?: boolean;
  resetTransition?: boolean;
  reducedMotion?: boolean;
}): ComparisonCameraController {
  let linked = initialLinked;
  let applyingMirror = false;

  const applyTo = (
    pane: ComparisonCameraPane,
    pose: ComparisonCameraPose,
    enableTransition: boolean,
  ) => {
    const controls = getControls(pane);
    if (!controls) return;
    applyingMirror = true;
    try {
      setComparisonCameraPose(controls, pose, enableTransition);
    } finally {
      applyingMirror = false;
    }
  };

  const snapBToA = () => {
    const controlsA = getControls('A');
    if (!controlsA || !getControls('B')) return;
    applyTo('B', readComparisonCameraPose(controlsA), false);
  };

  return {
    isLinked: () => linked,
    setLinked: (nextLinked) => {
      const wasLinked = linked;
      linked = nextLinked;
      if (!wasLinked && nextLinked) {
        snapBToA();
      }
    },
    handleUpdate: (source) => {
      if (!linked || applyingMirror) return;
      const target: ComparisonCameraPane = source === 'A' ? 'B' : 'A';
      const sourceControls = getControls(source);
      const targetControls = getControls(target);
      if (!sourceControls || !targetControls) return;

      const pose = readComparisonCameraPose(sourceControls);
      if (areComparisonCameraPosesEqual(readComparisonCameraPose(targetControls), pose)) return;
      applyTo(target, pose, false);
    },
    snapBToA,
    reset: () => {
      const transition = resetTransition && !reducedMotion;
      applyTo('A', DEFAULT_COMPARISON_CAMERA_POSE, transition);
      applyTo('B', DEFAULT_COMPARISON_CAMERA_POSE, transition);
    },
  };
}
