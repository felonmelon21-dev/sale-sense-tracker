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
    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verify user JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const productId = url.searchParams.get('id');

    if (!productId) {
      return new Response(JSON.stringify({ error: 'Product ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get product details
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError) throw productError;

    // Get price history (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: priceHistory, error: historyError } = await supabaseAdmin
      .from('price_snapshots')
      .select('*')
      .eq('product_id', productId)
      .gte('snapshot_at', thirtyDaysAgo.toISOString())
      .order('snapshot_at', { ascending: true });

    if (historyError) throw historyError;

    // Get user's tracker for this product
    const { data: tracker } = await supabaseAdmin
      .from('trackers')
      .select('*')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .single();

    // Calculate statistics
    const prices = priceHistory?.map((h) => h.price) || [];
    const lowestPrice = prices.length > 0 ? Math.min(...prices) : product.latest_price;
    const highestPrice = prices.length > 0 ? Math.max(...prices) : product.latest_price;
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : product.latest_price;

    return new Response(
      JSON.stringify({
        product,
        priceHistory: priceHistory || [],
        tracker,
        statistics: {
          lowestPrice,
          highestPrice,
          avgPrice: Math.round(avgPrice * 100) / 100,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in products function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
