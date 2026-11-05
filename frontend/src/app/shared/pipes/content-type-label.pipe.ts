import { Pipe, PipeTransform } from '@angular/core';

const LABELS: Record<string, string> = { blog_post: 'Blog Post', landing_page: 'Landing Page', faq: 'FAQ' };

@Pipe({ name: 'contentTypeLabel' })
export class ContentTypeLabelPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return 'Content';
    return LABELS[value] ?? value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
