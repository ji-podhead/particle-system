import { Particles } from './workerParticles.js';
import ParticleAutoDisposal, { startParticleWorker, updateWorkerValues, killWorker, workerUpdateSimulation } from './workerHelper.js';

export {
  Particles,
  startParticleWorker,
  updateWorkerValues,
  killWorker,
  workerUpdateSimulation,
  ParticleAutoDisposal
};