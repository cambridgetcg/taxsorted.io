// Server component — generateStaticParams must live here (not in "use client" files)
import VATPageClient from './vat-page-client';

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

export default async function VATPage({ params }: PageProps) {
  const { entityId } = await params;
  return <VATPageClient entityId={entityId} />;
}
