import { checkpointContract } from './checkpoint.contract';
import { InMemoryCheckpoint } from '@market-miam/event-sourcing';

checkpointContract('InMemoryCheckpoint', (name) => new InMemoryCheckpoint(name));
