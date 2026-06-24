import { checkpointContract } from './checkpoint.contract';
import { InMemoryCheckpoint } from '@market-monster/event-sourcing';

checkpointContract('InMemoryCheckpoint', () => new InMemoryCheckpoint('cp-1'));
