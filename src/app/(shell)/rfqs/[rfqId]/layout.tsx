import { RfqBundleProvider } from '@/context/RfqBundleContext';

interface RfqLayoutProps {
  children: React.ReactNode;
  params: Promise<{ rfqId: string }>;
}

export default async function RfqLayout({ children, params }: RfqLayoutProps) {
  const { rfqId } = await params;
  return <RfqBundleProvider rfqId={rfqId}>{children}</RfqBundleProvider>;
}
