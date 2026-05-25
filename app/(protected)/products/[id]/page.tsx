import { notFound } from 'next/navigation';
import { getProductById, getCustomFields, getProductCustomValues } from '@/app/actions/products';
import { getSetting } from '@/lib/db';
import { ProductForm } from '@/components/features/product-form';

export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) notFound();

  const [product, customFields, defaultCategories] = await Promise.all([
    getProductById(id),
    getCustomFields(),
    getSetting('default_categories'),
  ]);

  if (!product) notFound();

  const customValues = await getProductCustomValues(id);

  return (
    <ProductForm
      product={product}
      customFields={customFields}
      customValues={customValues}
      defaults={{ categories: defaultCategories ?? '' }}
    />
  );
}
