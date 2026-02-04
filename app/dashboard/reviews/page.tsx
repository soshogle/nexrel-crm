export const dynamic = 'force-dynamic';

import { ReviewsPage as ReviewsPageComponent } from '@/components/reviews/reviews-page';

export default function ReviewsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900/30 via-black to-pink-900/20 p-6">
      <ReviewsPageComponent />
    </div>
  );
}
