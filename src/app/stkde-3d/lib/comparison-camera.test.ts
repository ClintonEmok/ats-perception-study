import { describe, expect, test } from 'vitest';
import {
  DEFAULT_COMPARISON_CAMERA_POSE,
  createComparisonCameraController,
  readComparisonCameraPose,
  type ComparisonCameraControls,
} from './comparison-camera';

function createMockControls(initialPosition: [number, number, number]): ComparisonCameraControls & {
  position: [number, number, number];
  target: [number, number, number];
  calls: Array<{ pose: number[]; transition: boolean }>;
} {
  const controls = {
    position: [...initialPosition] as [number, number, number],
    target: [0, 0, 0] as [number, number, number],
    calls: [] as Array<{ pose: number[]; transition: boolean }>,
    getPosition: (out: { x: number; y: number; z: number }) => {
      out.x = controls.position[0];
      out.y = controls.position[1];
      out.z = controls.position[2];
      return out as never;
    },
    getTarget: (out: { x: number; y: number; z: number }) => {
      out.x = controls.target[0];
      out.y = controls.target[1];
      out.z = controls.target[2];
      return out as never;
    },
    setLookAt: (px: number, py: number, pz: number, tx: number, ty: number, tz: number, transition = false) => {
      controls.position = [px, py, pz];
      controls.target = [tx, ty, tz];
      controls.calls.push({ pose: [px, py, pz, tx, ty, tz], transition });
    },
  } satisfies ComparisonCameraControls & {
    position: [number, number, number];
    target: [number, number, number];
    calls: Array<{ pose: number[]; transition: boolean }>;
  };

  return controls;
}

describe('comparison camera linking', () => {
  test('links updates in either direction and defaults to linked', () => {
    const controlsA = createMockControls([1, 2, 3]);
    const controlsB = createMockControls([1, 2, 3]);
    const controller = createComparisonCameraController({
      getControls: (pane) => (pane === 'A' ? controlsA : controlsB),
    });

    expect(controller.isLinked()).toBe(true);
    controlsA.position = [10, 20, 30];
    controlsA.target = [1, 2, 3];
    controller.handleUpdate('A');
    expect(readComparisonCameraPose(controlsB)).toEqual({ position: [10, 20, 30], target: [1, 2, 3] });

    controlsB.position = [-10, -20, -30];
    controller.handleUpdate('B');
    expect(readComparisonCameraPose(controlsA)).toEqual({ position: [-10, -20, -30], target: [1, 2, 3] });
  });

  test('suppresses mirrored feedback and does not repeatedly set the target', () => {
    const controlsA = createMockControls([1, 2, 3]);
    const controlsB = createMockControls([1, 2, 3]);
    const controller = createComparisonCameraController({
      getControls: (pane) => (pane === 'A' ? controlsA : controlsB),
    });

    controlsA.position = [4, 5, 6];
    controller.handleUpdate('A');
    const callCount = controlsA.calls.length + controlsB.calls.length;
    controller.handleUpdate('B');
    expect(controlsA.calls.length + controlsB.calls.length).toBe(callCount);
  });

  test('preserves independent poses while unlinked and snaps B to A on relink', () => {
    const controlsA = createMockControls([1, 2, 3]);
    const controlsB = createMockControls([1, 2, 3]);
    const controller = createComparisonCameraController({
      getControls: (pane) => (pane === 'A' ? controlsA : controlsB),
    });

    controller.setLinked(false);
    controlsA.position = [8, 8, 8];
    controller.handleUpdate('A');
    expect(readComparisonCameraPose(controlsB).position).toEqual([1, 2, 3]);

    controlsB.position = [9, 9, 9];
    controller.setLinked(true);
    expect(readComparisonCameraPose(controlsB)).toEqual(readComparisonCameraPose(controlsA));
    expect(controlsB.calls.at(-1)?.transition).toBe(false);
  });

  test('resets both panes to the front-oblique pose with reduced-motion behavior', () => {
    const controlsA = createMockControls([1, 2, 3]);
    const controlsB = createMockControls([4, 5, 6]);
    const controller = createComparisonCameraController({
      getControls: (pane) => (pane === 'A' ? controlsA : controlsB),
      reducedMotion: true,
    });

    controller.reset();
    expect(readComparisonCameraPose(controlsA)).toEqual(DEFAULT_COMPARISON_CAMERA_POSE);
    expect(readComparisonCameraPose(controlsB)).toEqual(DEFAULT_COMPARISON_CAMERA_POSE);
    expect(controlsA.calls.at(-1)?.transition).toBe(false);
    expect(controlsB.calls.at(-1)?.transition).toBe(false);
  });
});
