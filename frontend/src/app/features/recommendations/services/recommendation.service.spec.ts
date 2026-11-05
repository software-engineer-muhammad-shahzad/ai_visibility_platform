import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { errorInterceptor } from '@core/interceptors/error.interceptor';
import { environment } from '@env/environment';
import { RecommendationService } from './recommendation.service';

describe('RecommendationService', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getRecommendations normalises priority and content type', () => {
    let first = '';
    TestBed.inject(RecommendationService).getRecommendations('abc').subscribe((r) => (first = `${r[0].priority}|${r[0].content_type}`));
    http
      .expectOne(`${environment.apiUrl}/profiles/abc/recommendations`)
      .flush([{ recommendation_uuid: 'r1', title: 't', priority: 'HIGH', content_type: 'Blog Post', target_keywords: ['a'] }]);
    expect(first).toBe('high|blog_post');
  });
});
