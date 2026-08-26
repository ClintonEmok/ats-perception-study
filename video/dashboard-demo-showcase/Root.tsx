import { Composition } from 'remotion';
import { DashboardDemoProductRelease } from './DashboardDemoProductRelease';
import { DashboardDemoShowcase } from './DashboardDemoShowcase';

export function DashboardDemoShowcaseRoot() {
  return (
    <>
      <Composition
        id="DashboardDemoProductRelease"
        component={DashboardDemoProductRelease}
        durationInFrames={1620}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="DashboardDemoShowcase"
        component={DashboardDemoShowcase}
        durationInFrames={1350}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
}
