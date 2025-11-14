import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('Starting batch price update...');

    // Get all products that are being tracked
    const { data: activeTrackers, error: trackersError } = await supabaseClient
      .from('trackers')
      .select('product_id')
      .eq('is_active', true);

    if (trackersError) throw trackersError;

    const productIds = [...new Set(activeTrackers?.map(t => t.product_id) || [])];

    const { data: products, error: productsError } = await supabaseClient
      .from('products')
      .select('id, url, platform')
      .in('id', productIds);

    if (productsError) throw productsError;

    console.log(`Found ${products?.length || 0} products to update`);

    let updated = 0;
    let failed = 0;

    // Update products in batches to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < (products?.length || 0); i += batchSize) {
      const batch = products!.slice(i, i + batchSize);
      
      const promises = batch.map(product =>
        supabaseClient.functions.invoke('scraper', {
          body: {
            productId: product.id,
            url: product.url,
            platform: product.platform,
          },
        })
      );

      const results = await Promise.allSettled(promises);
      
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          console.log(`Updated product ${batch[idx].id}`);
          updated++;
        } else {
          console.error(`Failed to update product ${batch[idx].id}:`, result.reason);
          failed++;
        }
      });

      // Wait 2 seconds between batches to avoid rate limiting
      if (i + batchSize < (products?.length || 0)) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // After all updates, check for alerts
    console.log('Checking for price alerts...');
    await supabaseClient.functions.invoke('check-alerts');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated ${updated} products, ${failed} failed`,
        updated,
        failed,
        total: products?.length || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in update-all-prices function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
