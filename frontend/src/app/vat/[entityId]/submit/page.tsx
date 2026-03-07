// Server component — generateStaticParams + Suspense boundary for useSearchParams
import { Suspense } from 'react';
import VATSubmitPageClient from './submit-page-client';

export function generateStaticParams() {
  return [
    { entityId: 'ent_001' },
    { entityId: 'ent_002' },
    { entityId: 'ent_003' },
  ];
}

interface PageProps {
  params: Promise<{ entityId: string }>;
}

export default async function VATSubmitPage({ params }: PageProps) {
  const { entityId } = await params;
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <VATSubmitPageClient entityId={entityId} />
    </Suspense>
  );
}
