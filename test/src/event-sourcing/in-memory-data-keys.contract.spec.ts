import { dataKeysContract } from './data-keys.contract';
import { InMemoryDataKeys } from '@market-miam/event-sourcing';

dataKeysContract('InMemoryDataKeys', () => new InMemoryDataKeys());
