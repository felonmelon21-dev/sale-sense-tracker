import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Tracker {
  id: string;
  user_id: string;
  product_id: string;
  target_price: number | null;
  is_active: boolean;
  created_at: string;
  products: {
    id: string;
    name: string;
    platform: string;
    url: string;
    latest_price: number;
    currency: string;
    image_url: string | null;
    is_available: boolean;
  };
}

export function useTrackers() {
  const queryClient = useQueryClient();

  const { data: trackers, isLoading, error } = useQuery({
    queryKey: ['trackers'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('trackers', {
        method: 'GET',
      });

      if (error) throw error;
      return data as Tracker[];
    },
  });

  const createTracker = useMutation({
    mutationFn: async ({ productUrl, targetPrice }: { productUrl: string; targetPrice?: number }) => {
      const { data, error } = await supabase.functions.invoke('trackers', {
        body: { productUrl, targetPrice },
        method: 'POST',
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trackers'] });
      toast({
        title: 'Tracker added!',
        description: 'We\'re fetching the product details now.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add tracker',
        variant: 'destructive',
      });
    },
  });

  const deleteTracker = useMutation({
    mutationFn: async (trackerId: string) => {
      const { error } = await supabase.functions.invoke(`trackers?id=${trackerId}`, {
        method: 'DELETE',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trackers'] });
      toast({
        title: 'Tracker removed',
        description: 'Product removed from your tracker list.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove tracker',
        variant: 'destructive',
      });
    },
  });

  return {
    trackers: trackers || [],
    isLoading,
    error,
    createTracker: createTracker.mutate,
    deleteTracker: deleteTracker.mutate,
    isCreating: createTracker.isPending,
    isDeleting: deleteTracker.isPending,
  };
}
