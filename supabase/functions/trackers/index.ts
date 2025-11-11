import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateTrackerRequest {
  productUrl: string;
  targetPrice?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET - List all trackers for the user
    if (req.method === 'GET') {
      const { data: trackers, error } = await supabaseClient
        .from('trackers')
        .select(`
          *,
          products (
            id,
            name,
            platform,
            url,
            latest_price,
            currency,
            image_url,
            is_available
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify(trackers), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST - Create a new tracker
    if (req.method === 'POST') {
      const { productUrl, targetPrice }: CreateTrackerRequest = await req.json();

      console.log('Creating tracker for URL:', productUrl);

      // Extract platform from URL
      const platform = extractPlatform(productUrl);
      if (!platform) {
        return new Response(JSON.stringify({ error: 'Unsupported platform' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if product already exists
      const { data: existingProduct } = await supabaseClient
        .from('products')
        .select('*')
        .eq('url', productUrl)
        .single();

      let productId: string;

      if (existingProduct) {
        productId = existingProduct.id;
        console.log('Product already exists:', productId);
      } else {
        // Create new product (scraping will happen in background)
        const { data: newProduct, error: productError } = await supabaseClient
          .from('products')
          .insert({
            name: 'Product loading...',
            platform,
            url: productUrl,
            latest_price: 0,
          })
          .select()
          .single();

        if (productError) throw productError;
        productId = newProduct.id;
        console.log('Created new product:', productId);

        // Trigger scraping in background (fire and forget)
        supabaseClient.functions.invoke('scraper', {
          body: { productId, url: productUrl, platform },
        }).catch((err) => console.error('Background scraping error:', err));
      }

      // Check if tracker already exists
      const { data: existingTracker } = await supabaseClient
        .from('trackers')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .single();

      if (existingTracker) {
        return new Response(
          JSON.stringify({ error: 'You are already tracking this product' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create tracker
      const { data: tracker, error: trackerError } = await supabaseClient
        .from('trackers')
        .insert({
          user_id: user.id,
          product_id: productId,
          target_price: targetPrice,
          is_active: true,
        })
        .select()
        .single();

      if (trackerError) throw trackerError;

      console.log('Tracker created successfully:', tracker.id);

      return new Response(JSON.stringify(tracker), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE - Remove a tracker
    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const trackerId = url.searchParams.get('id');

      if (!trackerId) {
        return new Response(JSON.stringify({ error: 'Tracker ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabaseClient
        .from('trackers')
        .delete()
        .eq('id', trackerId)
        .eq('user_id', user.id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in trackers function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function extractPlatform(url: string): string | null {
  const urlLower = url.toLowerCase();
  if (urlLower.includes('amazon.')) return 'Amazon';
  if (urlLower.includes('flipkart.')) return 'Flipkart';
  if (urlLower.includes('myntra.')) return 'Myntra';
  if (urlLower.includes('ajio.')) return 'Ajio';
  if (urlLower.includes('snapdeal.')) return 'Snapdeal';
  return null;
}
