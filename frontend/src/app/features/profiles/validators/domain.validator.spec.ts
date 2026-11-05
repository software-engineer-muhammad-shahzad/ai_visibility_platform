import { FormControl } from '@angular/forms';
import { domainValidator } from './domain.validator';

describe('domainValidator', () => {
  const check = (v: string) => domainValidator(new FormControl(v, { nonNullable: true }));

  it('accepts bare domains', () => {
    expect(check('surferseo.com')).toBeNull();
    expect(check('app.my-site.co.uk')).toBeNull();
  });
  it('rejects protocols', () => {
    expect(check('https://surferseo.com')).toEqual({ protocol: true });
    expect(check('http://surferseo.com')).toEqual({ protocol: true });
  });
  it('rejects invalid hostnames', () => {
    expect(check('surferseo')).toEqual({ domain: true });
    expect(check('surfer seo.com')).toEqual({ domain: true });
    expect(check('surferseo.com/blog')).toEqual({ domain: true });
  });
  it('leaves empty values to the required validator', () => {
    expect(check('')).toBeNull();
  });
});
