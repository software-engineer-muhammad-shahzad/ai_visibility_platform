import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { ContentTypeLabelPipe } from '@shared';
import { ContentRecommendation } from '../../models/recommendation.model';

@Component({
  selector: 'app-recommendation-card',
  imports: [MatCardModule, MatChipsModule, MatIconModule, ContentTypeLabelPipe],
  templateUrl: './recommendation-card.component.html',
  styleUrl: './recommendation-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecommendationCardComponent {
  readonly recommendation = input.required<ContentRecommendation>();

  protected readonly priority = computed(() => this.recommendation().priority ?? 'none');
  protected readonly typeIcon = computed(() => {
    const t = this.recommendation().content_type;
    return t === 'faq' ? 'quiz' : t === 'landing_page' ? 'web' : 'article';
  });
}
