import { dataKeysContract } from './data-keys.contract';
import { InMemoryDataKeys } from '@market-monster/event-sourcing';

dataKeysContract('InMemoryDataKeys', () => new InMemoryDataKeys());
