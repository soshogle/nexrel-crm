export const dynamic = 'force-dynamic';

import { ReviewsPage as ReviewsPageComponent } from '@/components/reviews/reviews-page';

export default function ReviewsPage() {
  return (
    <div className="min-h-screen bg-white p-6">
      <ReviewsPageComponent />
    </div>
  );
}
