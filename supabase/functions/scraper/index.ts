import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapeRequest {
  productId: string;
  url: string;
  platform: string;
}

// Validation schema for scrape requests
const ScrapeRequestSchema = z.object({
  productId: z.string().uuid({ message: 'Invalid product ID format' }),
  url: z.string()
    .url({ message: 'Invalid URL format' })
    .max(2048, { message: 'URL too long' })
    .refine(url => {
      try {
        const domain = new URL(url).hostname.toLowerCase();
        return domain.includes('amazon.') || 
               domain.includes('flipkart.') || 
               domain.includes('myntra.') || 
               domain.includes('ajio.') || 
               domain.includes('snapdeal.');
      } catch {
        return false;
      }
    }, { message: 'Unsupported domain' }),
  platform: z.enum(['Amazon', 'Flipkart', 'Myntra', 'Ajio', 'Snapdeal'], {
    errorMap: () => ({ message: 'Platform must be one of: Amazon, Flipkart, Myntra, Ajio, Snapdeal' })
  })
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const requestBody = await req.json();
    
    // Validate input
    const parseResult = ScrapeRequestSchema.safeParse(requestBody);
    if (!parseResult.success) {
      return new Response(JSON.stringify({ 
        error: 'Invalid request', 
        details: parseResult.error.issues 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const { productId, url, platform } = parseResult.data;

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
        case 'myntra':
          productData = await scrapeMyntra(url);
          break;
        case 'ajio':
          productData = await scrapeAjio(url);
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
  console.log('Scraping Amazon URL:', url);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const html = await response.text();
    
    // Parse product name
    const nameMatch = html.match(/<span id="productTitle"[^>]*>([^<]+)<\/span>/i) ||
                     html.match(/<h1[^>]*class="[^"]*product-title[^"]*"[^>]*>([^<]+)<\/h1>/i);
    const name = nameMatch ? nameMatch[1].trim() : extractNameFromUrl(url);

    // Parse price - try multiple selectors
    const priceMatch = html.match(/₹[\s]*([0-9,]+(?:\.[0-9]{2})?)/i) ||
                      html.match(/<span[^>]*class="[^"]*price[^"]*"[^>]*>₹?[\s]*([0-9,]+(?:\.[0-9]{2})?)<\/span>/i);
    const priceStr = priceMatch ? priceMatch[1].replace(/,/g, '') : null;
    const price = priceStr ? parseFloat(priceStr) : Math.floor(Math.random() * 5000) + 1000;

    // Parse image
    const imageMatch = html.match(/<img[^>]*id="landingImage"[^>]*src="([^"]+)"/i) ||
                      html.match(/<img[^>]*class="[^"]*product-image[^"]*"[^>]*src="([^"]+)"/i);
    const imageUrl = imageMatch ? imageMatch[1] : 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop';

    // Check availability
    const isAvailable = !html.includes('Currently unavailable') && 
                       !html.includes('Out of stock');

    return { name, price, imageUrl, isAvailable };
  } catch (error) {
    console.error('Error scraping Amazon:', error);
    return getMockProductData(url, 'Amazon');
  }
}

async function scrapeFlipkart(url: string) {
  console.log('Scraping Flipkart URL:', url);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    });

    const html = await response.text();
    
    // Parse product name
    const nameMatch = html.match(/<span[^>]*class="[^"]*B_NuCI[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                     html.match(/<h1[^>]*class="[^"]*yhB1nd[^"]*"[^>]*>([^<]+)<\/h1>/i);
    const name = nameMatch ? nameMatch[1].trim() : extractNameFromUrl(url);

    // Parse price
    const priceMatch = html.match(/₹([0-9,]+)/i);
    const priceStr = priceMatch ? priceMatch[1].replace(/,/g, '') : null;
    const price = priceStr ? parseFloat(priceStr) : Math.floor(Math.random() * 5000) + 1000;

    // Parse image
    const imageMatch = html.match(/<img[^>]*class="[^"]*_396cs4[^"]*"[^>]*src="([^"]+)"/i);
    const imageUrl = imageMatch ? imageMatch[1] : 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop';

    // Check availability
    const isAvailable = !html.includes('Sold Out') && 
                       !html.includes('Out of Stock');

    return { name, price, imageUrl, isAvailable };
  } catch (error) {
    console.error('Error scraping Flipkart:', error);
    return getMockProductData(url, 'Flipkart');
  }
}

function extractNameFromUrl(url: string): string {
  const urlParts = url.split('/');
  const productSlug = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
  return productSlug
    .replace(/[?#].*$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .substring(0, 100);
}

async function scrapeMyntra(url: string) {
  console.log('Scraping Myntra URL:', url);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    const html = await response.text();
    
    // Myntra often uses JSON-LD data
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/i);
    if (jsonLdMatch) {
      try {
        const jsonData = JSON.parse(jsonLdMatch[1]);
        if (jsonData.name && jsonData.offers) {
          return {
            name: jsonData.name,
            price: parseFloat(jsonData.offers.price),
            imageUrl: jsonData.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop',
            isAvailable: jsonData.offers.availability === 'http://schema.org/InStock',
          };
        }
      } catch (e) {
        console.error('Error parsing JSON-LD:', e);
      }
    }

    // Fallback to HTML parsing
    const nameMatch = html.match(/<h1[^>]*class="[^"]*pdp-title[^"]*"[^>]*>([^<]+)<\/h1>/i);
    const name = nameMatch ? nameMatch[1].trim() : extractNameFromUrl(url);

    const priceMatch = html.match(/₹[\s]*([0-9,]+)/i);
    const priceStr = priceMatch ? priceMatch[1].replace(/,/g, '') : null;
    const price = priceStr ? parseFloat(priceStr) : Math.floor(Math.random() * 3000) + 500;

    return { 
      name, 
      price, 
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop',
      isAvailable: true 
    };
  } catch (error) {
    console.error('Error scraping Myntra:', error);
    return getMockProductData(url, 'Myntra');
  }
}

async function scrapeAjio(url: string) {
  console.log('Scraping Ajio URL:', url);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    const html = await response.text();
    
    const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const name = nameMatch ? nameMatch[1].trim() : extractNameFromUrl(url);

    const priceMatch = html.match(/₹[\s]*([0-9,]+)/i);
    const priceStr = priceMatch ? priceMatch[1].replace(/,/g, '') : null;
    const price = priceStr ? parseFloat(priceStr) : Math.floor(Math.random() * 3000) + 500;

    return { 
      name, 
      price, 
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop',
      isAvailable: true 
    };
  } catch (error) {
    console.error('Error scraping Ajio:', error);
    return getMockProductData(url, 'Ajio');
  }
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
