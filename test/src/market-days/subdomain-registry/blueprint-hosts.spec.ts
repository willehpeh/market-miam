import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ReservedSubdomainError, Subdomain } from '@market-miam/market-days';

const BLUEPRINT = fileURLToPath(new URL('../../../../render.yaml', import.meta.url));

// Each `- <label>.marketmiam.fr` render.yaml lists among a service's domains. The storefronts'
// wildcard, `*.marketmiam.fr`, has no label and is left out, and so is the bare domain.
const hosts = [...readFileSync(BLUEPRINT, 'utf8').matchAll(/^\s*-\s*'?([a-z0-9-]+)\.marketmiam\.fr'?\s*$/gm)].map(
  ([, label]) => label,
);

// A host the blueprint gives a service of its own never reaches the storefronts: no vendor may
// be given it (ADR 0065). A service added on a new host fails here until its name is reserved.
describe('The hosts render.yaml serves', () => {
  it('are read from the blueprint', () => {
    expect(hosts).toContain('api');
  });

  it.each(hosts)('keep %s from every vendor', (label) => {
    expect(() => new Subdomain(label)).toThrow(ReservedSubdomainError);
  });
});
