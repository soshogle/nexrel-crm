export const dynamic = 'force-dynamic';

import { ReviewsPage as ReviewsPageComponent } from '@/components/reviews/reviews-page';

export default function ReviewsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-indigo-950 p-6">
      <ReviewsPageComponent />
    </div>
  );
}
