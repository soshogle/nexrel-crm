export const dynamic = 'force-dynamic';

import { ReviewsPage as ReviewsPageComponent } from '@/components/reviews/reviews-page';

export default function ReviewsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-6">
      <ReviewsPageComponent />
    </div>
  );
}
