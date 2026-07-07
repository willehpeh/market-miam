import { checkpointContract } from './checkpoint.contract';
import { InMemoryCheckpoint } from '@market-miam/event-sourcing';

checkpointContract('InMemoryCheckpoint', () => new InMemoryCheckpoint('cp-1'));
