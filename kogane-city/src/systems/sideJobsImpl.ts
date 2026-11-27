import { SideJobs } from './SideJobs';
import type { WorldScene } from '../scenes/WorldScene';

/** Builds the side-job system. (Placeholder until the jobs are written.) */
export function createSideJobs(world: WorldScene): SideJobs {
  return new SideJobs(world);
}
