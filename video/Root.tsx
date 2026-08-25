import { Composition } from 'remotion';
import {
  ConstructingDashboard,
  type ConstructingDashboardProps,
} from './ConstructingDashboard';
import {
  ConstructingRealDashboard,
  type ConstructingRealDashboardProps,
} from './ConstructingRealDashboard';
import { CubeExplainer, TimelineExplainer } from './ComponentExplainers';
import { CubeEvolutionExplainer } from './CubeEvolutionExplainer';
import { DashboardShowcaseAnimation } from './dashboard-showcase';
import { RealDashboardAnimation } from './real-dashboard-showcase';
import { DensityApproachesAnimation } from './density-approaches';
import { EqualTimeAnimation } from './equal-time-concept';
import { VisualAllocationAnimation } from './visual-allocation';
import { WangAnimation, WangGraphAnimation } from './wang-timeslicing';

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="RealDashboardShowcase"
        component={RealDashboardAnimation}
        durationInFrames={1800}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="DashboardShowcase"
        component={DashboardShowcaseAnimation}
        durationInFrames={1800}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="WangTimeslicing"
        component={WangAnimation}
        durationInFrames={1800}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="WangTimeslicingWithGraphs"
        component={WangGraphAnimation}
        durationInFrames={1800}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="VisualAllocationConcept"
        component={VisualAllocationAnimation}
        durationInFrames={1800}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="DensityApproachesConcept"
        component={DensityApproachesAnimation}
        durationInFrames={1800}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="EqualTimeConcept"
        component={EqualTimeAnimation}
        durationInFrames={2700}
        fps={30}
        width={1920}
        height={1080}
      />
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
      <Composition
        id="TimelineExplainer"
        component={TimelineExplainer}
        durationInFrames={720}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="CubeExplainer"
        component={CubeExplainer}
        durationInFrames={720}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="CubeEvolutionExplainer"
        component={CubeEvolutionExplainer}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
