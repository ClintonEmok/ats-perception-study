import { Composition } from 'remotion';
import {
  ConstructingDashboard,
  type ConstructingDashboardProps,
} from './ConstructingDashboard';
import {
  ConstructingRealDashboard,
  type ConstructingRealDashboardProps,
} from './ConstructingRealDashboard';

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="ConstructingDashboard"
        component={ConstructingDashboard}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          heading: 'Constructing the Coordinated Dashboard',
          subtext: 'Separate views become one analytical workflow through shared temporal selection.',
        } satisfies ConstructingDashboardProps}
      />
      <Composition
        id="ConstructingRealDashboard"
        component={ConstructingRealDashboard}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          heading: 'Constructing the Coordinated Dashboard',
          subtext: 'Real weekly records become one analytical workflow through shared temporal selection.',
        } satisfies ConstructingRealDashboardProps}
      />
    </>
  );
};
