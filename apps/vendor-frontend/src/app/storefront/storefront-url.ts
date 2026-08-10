import { environment } from '../../environments/environment';

export function storefrontUrl(subdomain: string | null | undefined): { href: string; label: string } | null {
  if (!subdomain) {
    return null;
  }
  const domain = `${ subdomain }.${ environment.storefrontBaseDomain }`;
  return { href: `https://${ domain }`, label: domain };
}
