export abstract class Subscription {
  abstract poll(): Promise<void>;
}
