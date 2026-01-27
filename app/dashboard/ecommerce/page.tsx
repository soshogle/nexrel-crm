
import { Metadata } from 'next';
import { ProductCatalog } from '@/components/ecommerce/product-catalog';
import { StorefrontSettings } from '@/components/ecommerce/storefront-settings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const metadata: Metadata = {
  title: 'E-commerce | Soshogle CRM',
  description: 'Manage your online store and products',
};

export default function EcommercePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">E-commerce</h2>
        <p className="text-muted-foreground">
          Manage your online store, products, and storefront settings
        </p>
      </div>

      <Tabs defaultValue="products" className="space-y-6">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="storefront">Storefront</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          <ProductCatalog />
        </TabsContent>

        <TabsContent value="storefront" className="space-y-6">
          <StorefrontSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
