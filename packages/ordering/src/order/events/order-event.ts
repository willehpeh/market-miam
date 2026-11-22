import { OrderPlaced } from './order-placed';
import { OrderRefused } from './order-refused';

export type OrderEvent = OrderPlaced | OrderRefused;
