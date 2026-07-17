import { environment } from '../../environments/environment';
import { CustomerStorefront } from './customer-storefront';

export type DishViewModel = {
  itemId: string;
  name: string;
  description: string;
  priceLabel: string;
  photo: { cardUrl: string; sheetUrl: string } | null;
};

export type StorefrontViewModel =
  | {
      status: 'published';
      name: string;
      description: string;
      phone: string;
      coverUrl: string | null;
      dishes: DishViewModel[];
    }
  | {
      status: 'coming-soon';
      name: string | null;
    };

export function toViewModel(storefront: CustomerStorefront): StorefrontViewModel {
  if (storefront.status === 'coming-soon') {
    return storefront;
  }
  return {
    status: 'published',
    name: storefront.name,
    description: storefront.description,
    phone: storefront.phone,
    coverUrl: storefront.coverPhoto ? cloudinaryUrl(storefront.coverPhoto, 'c_fill,w_1200,h_750,q_auto,f_auto') : null,
    dishes: storefront.dishes.map(dish => ({
      itemId: dish.itemId,
      name: dish.name,
      description: dish.description,
      priceLabel: formatEuros(dish.price),
      photo: dish.imageReference
        ? {
            cardUrl: cloudinaryUrl(dish.imageReference, 'c_fill,w_400,h_400,q_auto,f_auto'),
            sheetUrl: cloudinaryUrl(dish.imageReference, 'c_fill,w_1200,h_900,q_auto,f_auto'),
          }
        : null,
    })),
  };
}

function cloudinaryUrl(reference: string, transform: string): string {
  return `https://res.cloudinary.com/${environment.cloudinary.cloudName}/image/upload/${transform}/${reference}`;
}

function formatEuros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}
