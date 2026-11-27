import { INestApplication } from '@nestjs/common';
import { Subscriptions } from '../event-sourcing/subscriptions';
import { VendorApi } from '../testing/vendor-api';

export const TUESDAY = '2026-06-23';

export const bourguignon = {
  itemId: 'item-1',
  name: 'Bœuf bourguignon',
  description: 'Mijoté maison',
  price: 1300,
  imageReference: 'v1/dishes/acme-bakery/item-1',
  allergens: [],
};

export const pizza = {
  itemId: 'item-2',
  name: 'Pizza',
  description: 'Au feu de bois',
  imageReference: 'v1/dishes/acme-bakery/item-2',
  allergens: ['gluten', 'milk'],
  variants: [
    { name: 'Margherita', description: '', price: 900 },
    { name: 'Pepperoni', description: 'épicée', price: 1200 },
  ],
};

export const tuesdays = {
  scheduleId: 'schedule-1',
  startDate: TUESDAY,
  market: {
    id: 'market-1',
    name: 'Marché de Belleville',
    streetAddress: 'Boulevard de Belleville',
    codePostal: '75011',
    town: 'Paris',
    pitch: 'B12',
  },
  days: [{ day: 'TUE', startTime: '07:00', endTime: '14:30' }],
  frequency: { weeks: 1 },
};

export async function planTuesday(app: INestApplication, vendor: VendorApi): Promise<void> {
  await vendor.addItem(bourguignon).expect(201);
  await vendor.addItem(pizza).expect(201);
  await vendor.registerSchedule(tuesdays).expect(201);
  await vendor.setMenu('market-1', TUESDAY, [bourguignon.itemId, pizza.itemId]).expect(200);
  await app.get(Subscriptions).drain();
}
