import { MarketId } from '@market-miam/shared-kernel';
import { MarketName } from './market-name';
import { StreetAddress } from './street-address';
import { PostalCode } from './postal-code';
import { Town } from './town';
import { Pitch } from './pitch';

type MarketSnapshot = {
  id: string;
  name: string;
  streetAddress: string;
  codePostal: string;
  town: string;
  pitch?: string;
};

type MarketParams = {
  id: MarketId;
  name: MarketName;
  streetAddress: StreetAddress;
  postalCode: PostalCode;
  town: Town;
  pitch?: Pitch;
};

export class Market {
  private readonly _id: MarketId;
  private readonly _name: MarketName;
  private readonly _streetAddress: StreetAddress;
  private readonly _postalCode: PostalCode;
  private readonly _town: Town;
  private readonly _pitch?: Pitch;

  constructor(params: MarketParams) {
    this._id = params.id;
    this._name = params.name;
    this._streetAddress = params.streetAddress;
    this._postalCode = params.postalCode;
    this._town = params.town;
    this._pitch = params.pitch;
  }

  snapshot(): MarketSnapshot {
    return {
      id: this._id.value(),
      name: this._name.value(),
      streetAddress: this._streetAddress.value(),
      codePostal: this._postalCode.value(),
      town: this._town.value(),
      ...(this._pitch ? { pitch: this._pitch.value() } : {}),
    };
  }
}
