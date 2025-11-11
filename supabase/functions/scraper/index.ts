import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapeRequest {
  productId: string;
  url: string;
  platform: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { productId, url, platform }: ScrapeRequest = await req.json();

    console.log(`Starting scrape for product ${productId} on ${platform}`);

    let productData;
    try {
      // Call appropriate scraper based on platform
      switch (platform.toLowerCase()) {
        case 'amazon':
          productData = await scrapeAmazon(url);
          break;
        case 'flipkart':
          productData = await scrapeFlipkart(url);
          break;
        default:
          // For unsupported platforms, return mock data
          productData = await getMockProductData(url, platform);
      }

      // Update product with scraped data
      const { error: updateError } = await supabaseClient
        .from('products')
        .update({
          name: productData.name,
          latest_price: productData.price,
          image_url: productData.imageUrl,
          is_available: productData.isAvailable,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId);

      if (updateError) throw updateError;

      // Insert price snapshot
      const { error: snapshotError } = await supabaseClient
        .from('price_snapshots')
        .insert({
          product_id: productId,
          price: productData.price,
          is_available: productData.isAvailable,
          snapshot_at: new Date().toISOString(),
        });

      if (snapshotError) throw snapshotError;

      // Log successful scrape
      await supabaseClient.from('scrape_logs').insert({
        product_id: productId,
        status: 'SUCCESS',
        scraped_at: new Date().toISOString(),
      });

      // Check for price alerts
      await checkPriceAlerts(supabaseClient, productId, productData.price);

      console.log(`Successfully scraped product ${productId}`);

      return new Response(JSON.stringify({ success: true, productData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (scrapeError) {
      console.error(`Error scraping product ${productId}:`, scrapeError);

      // Log failed scrape
      const errorMessage = scrapeError instanceof Error ? scrapeError.message : 'Unknown scraping error';
      await supabaseClient.from('scrape_logs').insert({
        product_id: productId,
        status: 'FAILED',
        error_message: errorMessage,
        scraped_at: new Date().toISOString(),
      });

      throw scrapeError;
    }
  } catch (error) {
    console.error('Error in scraper function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function scrapeAmazon(url: string) {
  // For now, using mock data. In production, implement Playwright scraping
  console.log('Scraping Amazon URL:', url);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return getMockProductData(url, 'Amazon');
}

async function scrapeFlipkart(url: string) {
  // For now, using mock data. In production, implement Playwright scraping
  console.log('Scraping Flipkart URL:', url);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return getMockProductData(url, 'Flipkart');
}

async function getMockProductData(url: string, platform: string) {
  // Extract product name from URL
  const urlParts = url.split('/');
  const productSlug = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
  const name = productSlug
    .replace(/[?#].*$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .substring(0, 100);

  return {
    name: name || `Product from ${platform}`,
    price: Math.floor(Math.random() * 5000) + 1000,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop',
    isAvailable: Math.random() > 0.1, // 90% availability
  };
}

async function checkPriceAlerts(supabaseClient: any, productId: string, newPrice: number) {
  // Get all active trackers for this product
  const { data: trackers, error } = await supabaseClient
    .from('trackers')
    .select('*')
    .eq('product_id', productId)
    .eq('is_active', true);

  if (error || !trackers) return;

  for (const tracker of trackers) {
    // Check if price is below target
    if (tracker.target_price && newPrice <= tracker.target_price) {
      // Create alert
      await supabaseClient.from('alerts').insert({
        user_id: tracker.user_id,
        tracker_id: tracker.id,
        old_price: tracker.target_price,
        new_price: newPrice,
        status: 'PENDING',
      });

      console.log(`Price alert created for tracker ${tracker.id}`);
    }
  }
}
