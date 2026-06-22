import { checkpointContract } from './checkpoint.contract';
import { InMemoryCheckpoint } from '../in-memory.checkpoint';

checkpointContract('InMemoryCheckpoint', () => new InMemoryCheckpoint('cp-1'));
