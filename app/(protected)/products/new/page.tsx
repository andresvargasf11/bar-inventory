import { getCustomFields } from '@/app/actions/products';
import { getSetting } from '@/lib/db';
import { ProductForm } from '@/components/features/product-form';

export default async function NewProductPage() {
  const [customFields, defaultUnit, defaultCategories] = await Promise.all([
    getCustomFields(),
    getSetting('default_unit'),
    getSetting('default_categories'),
  ]);

  return (
    <ProductForm
      customFields={customFields}
      defaults={{ unit: defaultUnit ?? '', categories: defaultCategories ?? '' }}
    />
  );
}
