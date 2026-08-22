import { Composition } from 'remotion';
import {
  ConstructingDashboard,
  type ConstructingDashboardProps,
} from './ConstructingDashboard';

export const RemotionRoot = () => {
  return (
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
  );
};
