import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductDetail {
  product: {
    id: string;
    name: string;
    platform: string;
    url: string;
    latest_price: number;
    currency: string;
    image_url: string | null;
    is_available: boolean;
    created_at: string;
  };
  priceHistory: Array<{
    id: string;
    product_id: string;
    price: number;
    currency: string;
    is_available: boolean;
    snapshot_at: string;
  }>;
  tracker: {
    id: string;
    target_price: number | null;
    is_active: boolean;
  } | null;
  statistics: {
    lowestPrice: number;
    highestPrice: number;
    avgPrice: number;
  };
}

export function useProduct(productId: string | undefined) {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!productId) throw new Error('Product ID required');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke(`products?id=${productId}`, {
        method: 'GET',
      });

      if (error) throw error;
      return data as ProductDetail;
    },
    enabled: !!productId,
  });
}
