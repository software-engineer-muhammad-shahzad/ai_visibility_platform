import { AbstractControl, ValidationErrors } from '@angular/forms';

const DOMAIN_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

/** Rejects URLs with a protocol and anything that is not a bare hostname such as "surferseo.com". */
export function domainValidator(control: AbstractControl<string>): ValidationErrors | null {
  const v = (control.value ?? '').trim();
  if (!v) return null; // `required` reports empty values
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) return { protocol: true };
  return DOMAIN_RE.test(v) ? null : { domain: true };
}
