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
          throw new Error(`Unsupported platform: ${platform}`);
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log('Amazon HTML length:', html.length);
    
    // Try JSON-LD structured data first
    let name = extractNameFromUrl(url);
    let price: number | null = null;
    let imageUrl = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop';
    
    const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/is);
    if (jsonLdMatch) {
      try {
        const jsonData = JSON.parse(jsonLdMatch[1]);
        if (jsonData.name) name = jsonData.name;
        if (jsonData.offers?.price) price = parseFloat(String(jsonData.offers.price));
        if (jsonData.image) imageUrl = Array.isArray(jsonData.image) ? jsonData.image[0] : jsonData.image;
      } catch (e) {
        console.log('Failed to parse JSON-LD:', e);
      }
    }
    
    // Fallback: Parse product name from multiple selectors
    if (!name || name === extractNameFromUrl(url)) {
      const namePatterns = [
        /<span id="productTitle"[^>]*>\s*([^<]+?)\s*<\/span>/i,
        /<h1[^>]*id="title"[^>]*>\s*([^<]+?)\s*<\/h1>/i,
        /<h1[^>]*class="[^"]*product[^"]*title[^"]*"[^>]*>\s*([^<]+?)\s*<\/h1>/i,
      ];
      for (const pattern of namePatterns) {
        const match = html.match(pattern);
        if (match) {
          name = match[1].trim();
          break;
        }
      }
    }

    // Fallback: Parse price from multiple selectors
    if (!price) {
      const pricePatterns = [
        /<span[^>]*class="[^"]*a-price-whole[^"]*"[^>]*>([0-9,]+)/i,
        /<span[^>]*class="[^"]*a-offscreen[^"]*"[^>]*>₹[\s]*([0-9,]+(?:\.[0-9]{2})?)/i,
        /₹\s*([0-9,]+(?:\.[0-9]{2})?)/i,
      ];
      for (const pattern of pricePatterns) {
        const match = html.match(pattern);
        if (match) {
          const priceStr = match[1].replace(/,/g, '');
          price = parseFloat(priceStr);
          if (!isNaN(price) && price > 0) break;
          price = null;
        }
      }
    }

    // Fallback: Parse image from multiple selectors
    if (imageUrl === 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop') {
      const imagePatterns = [
        /<img[^>]*id="landingImage"[^>]*data-old-hires="([^"]+)"/i,
        /<img[^>]*id="landingImage"[^>]*src="([^"]+)"/i,
        /<img[^>]*class="[^"]*a-dynamic-image[^"]*"[^>]*src="([^"]+)"/i,
      ];
      for (const pattern of imagePatterns) {
        const match = html.match(pattern);
        if (match && match[1] && !match[1].includes('data:image')) {
          imageUrl = match[1];
          break;
        }
      }
    }

    // Check availability
    const isAvailable = !html.includes('Currently unavailable') && 
                       !html.includes('Out of stock') &&
                       !html.includes('Temporarily out of stock');

    if (!price) {
      throw new Error('Could not extract price from Amazon page');
    }

    console.log('Amazon scraped:', { name: name.substring(0, 50), price, hasImage: imageUrl !== 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop' });

    return { name, price, imageUrl, isAvailable };
  } catch (error) {
    console.error('Error scraping Amazon:', error);
    throw new Error(`Failed to scrape Amazon: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function scrapeFlipkart(url: string) {
  console.log('Scraping Flipkart URL:', url);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log('Flipkart HTML length:', html.length);
    
    let name = extractNameFromUrl(url);
    let price: number | null = null;
    let imageUrl = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop';

    // Try JSON-LD structured data first
    const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/is);
    if (jsonLdMatch) {
      try {
        const jsonData = JSON.parse(jsonLdMatch[1]);
        if (jsonData.name) name = jsonData.name;
        if (jsonData.offers?.price) price = parseFloat(String(jsonData.offers.price));
        if (jsonData.image) imageUrl = Array.isArray(jsonData.image) ? jsonData.image[0] : jsonData.image;
      } catch (e) {
        console.log('Failed to parse JSON-LD:', e);
      }
    }
    
    // Parse product name from multiple selectors
    if (!name || name === extractNameFromUrl(url)) {
      const namePatterns = [
        /<span[^>]*class="[^"]*VU-ZEz[^"]*"[^>]*>([^<]+)<\/span>/i,
        /<span[^>]*class="[^"]*B_NuCI[^"]*"[^>]*>([^<]+)<\/span>/i,
        /<h1[^>]*class="[^"]*yhB1nd[^"]*"[^>]*>([^<]+)<\/h1>/i,
        /<h1[^>]*>\s*<span[^>]*>([^<]+)<\/span>/i,
      ];
      for (const pattern of namePatterns) {
        const match = html.match(pattern);
        if (match) {
          name = match[1].trim();
          break;
        }
      }
    }

    // Parse price from multiple selectors
    if (!price) {
      const pricePatterns = [
        /<div[^>]*class="[^"]*Nx9bqj[^"]*CxhGGd[^"]*"[^>]*>₹([0-9,]+)/i,
        /<div[^>]*class="[^"]*_30jeq3[^"]*"[^>]*>₹([0-9,]+)/i,
        /₹\s*([0-9,]+(?:\.[0-9]{2})?)/i,
      ];
      for (const pattern of pricePatterns) {
        const match = html.match(pattern);
        if (match) {
          const priceStr = match[1].replace(/,/g, '');
          price = parseFloat(priceStr);
          if (!isNaN(price) && price > 0) break;
          price = null;
        }
      }
    }

    // Parse image from multiple selectors
    if (imageUrl === 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop') {
      const imagePatterns = [
        /<img[^>]*class="[^"]*_396cs4[^"]*"[^>]*src="([^"]+)"/i,
        /<img[^>]*class="[^"]*_2r_T1I[^"]*"[^>]*src="([^"]+)"/i,
        /<img[^>]*class="[^"]*_53J4C-[^"]*"[^>]*src="([^"]+)"/i,
      ];
      for (const pattern of imagePatterns) {
        const match = html.match(pattern);
        if (match && match[1] && !match[1].includes('data:image')) {
          imageUrl = match[1].replace(/\{@@width@@\}/g, '500').replace(/\{@@height@@\}/g, '500');
          break;
        }
      }
    }

    // Check availability
    const isAvailable = !html.includes('Sold Out') && 
                       !html.includes('Out of Stock') &&
                       !html.includes('Currently unavailable');

    if (!price) {
      throw new Error('Could not extract price from Flipkart page');
    }

    console.log('Flipkart scraped:', { name: name.substring(0, 50), price, hasImage: imageUrl !== 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop' });

    return { name, price, imageUrl, isAvailable };
  } catch (error) {
    console.error('Error scraping Flipkart:', error);
    throw new Error(`Failed to scrape Flipkart: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log('Myntra HTML length:', html.length);
    
    let name = extractNameFromUrl(url);
    let price: number | null = null;
    let imageUrl = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop';
    let isAvailable = true;
    
    // Try JSON-LD structured data first (Myntra often uses this)
    const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/is);
    if (jsonLdMatch) {
      try {
        const jsonData = JSON.parse(jsonLdMatch[1]);
        if (jsonData.name) name = jsonData.name;
        if (jsonData.offers?.price) price = parseFloat(String(jsonData.offers.price));
        if (jsonData.image) imageUrl = Array.isArray(jsonData.image) ? jsonData.image[0] : jsonData.image;
        if (jsonData.offers?.availability) {
          isAvailable = jsonData.offers.availability === 'http://schema.org/InStock' || 
                       jsonData.offers.availability === 'InStock';
        }
      } catch (e) {
        console.log('Failed to parse JSON-LD:', e);
      }
    }

    // Fallback: Parse from HTML
    if (!name || name === extractNameFromUrl(url)) {
      const namePatterns = [
        /<h1[^>]*class="[^"]*pdp-title[^"]*"[^>]*>([^<]+)<\/h1>/i,
        /<h1[^>]*class="[^"]*pdp-name[^"]*"[^>]*>([^<]+)<\/h1>/i,
        /<h1[^>]*>\s*([^<]+?)\s*<\/h1>/i,
      ];
      for (const pattern of namePatterns) {
        const match = html.match(pattern);
        if (match) {
          name = match[1].trim();
          break;
        }
      }
    }

    if (!price) {
      const pricePatterns = [
        /<span[^>]*class="[^"]*pdp-price[^"]*"[^>]*>₹\s*([0-9,]+)/i,
        /<strong[^>]*class="[^"]*pdp-price[^"]*"[^>]*>₹\s*([0-9,]+)/i,
        /₹\s*([0-9,]+(?:\.[0-9]{2})?)/i,
      ];
      for (const pattern of pricePatterns) {
        const match = html.match(pattern);
        if (match) {
          const priceStr = match[1].replace(/,/g, '');
          price = parseFloat(priceStr);
          if (!isNaN(price) && price > 0) break;
          price = null;
        }
      }
    }

    if (imageUrl === 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop') {
      const imagePatterns = [
        /<img[^>]*class="[^"]*image-grid-image[^"]*"[^>]*src="([^"]+)"/i,
        /<img[^>]*class="[^"]*img-responsive[^"]*"[^>]*src="([^"]+)"/i,
      ];
      for (const pattern of imagePatterns) {
        const match = html.match(pattern);
        if (match && match[1] && !match[1].includes('data:image')) {
          imageUrl = match[1];
          break;
        }
      }
    }

    if (!price) {
      throw new Error('Could not extract price from Myntra page');
    }

    console.log('Myntra scraped:', { name: name.substring(0, 50), price, hasImage: imageUrl !== 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop' });

    return { name, price, imageUrl, isAvailable };
  } catch (error) {
    console.error('Error scraping Myntra:', error);
    throw new Error(`Failed to scrape Myntra: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function scrapeAjio(url: string) {
  console.log('Scraping Ajio URL:', url);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log('Ajio HTML length:', html.length);
    
    let name = extractNameFromUrl(url);
    let price: number | null = null;
    let imageUrl = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop';
    
    // Try JSON-LD structured data first
    const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/is);
    if (jsonLdMatch) {
      try {
        const jsonData = JSON.parse(jsonLdMatch[1]);
        if (jsonData.name) name = jsonData.name;
        if (jsonData.offers?.price) price = parseFloat(String(jsonData.offers.price));
        if (jsonData.image) imageUrl = Array.isArray(jsonData.image) ? jsonData.image[0] : jsonData.image;
      } catch (e) {
        console.log('Failed to parse JSON-LD:', e);
      }
    }

    // Parse product name from HTML
    if (!name || name === extractNameFromUrl(url)) {
      const namePatterns = [
        /<h1[^>]*class="[^"]*prod-name[^"]*"[^>]*>([^<]+)<\/h1>/i,
        /<h1[^>]*>\s*([^<]+?)\s*<\/h1>/i,
        /<span[^>]*class="[^"]*prod-name[^"]*"[^>]*>([^<]+)<\/span>/i,
      ];
      for (const pattern of namePatterns) {
        const match = html.match(pattern);
        if (match) {
          name = match[1].trim();
          break;
        }
      }
    }

    // Parse price from HTML
    if (!price) {
      const pricePatterns = [
        /<span[^>]*class="[^"]*prod-sp[^"]*"[^>]*>₹\s*([0-9,]+)/i,
        /<div[^>]*class="[^"]*prod-price[^"]*"[^>]*>₹\s*([0-9,]+)/i,
        /₹\s*([0-9,]+(?:\.[0-9]{2})?)/i,
      ];
      for (const pattern of pricePatterns) {
        const match = html.match(pattern);
        if (match) {
          const priceStr = match[1].replace(/,/g, '');
          price = parseFloat(priceStr);
          if (!isNaN(price) && price > 0) break;
          price = null;
        }
      }
    }

    // Parse image from HTML
    if (imageUrl === 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop') {
      const imagePatterns = [
        /<img[^>]*class="[^"]*img-[^"]*"[^>]*src="([^"]+)"/i,
        /<img[^>]*src="([^"]+)"[^>]*class="[^"]*prod-img[^"]*"/i,
      ];
      for (const pattern of imagePatterns) {
        const match = html.match(pattern);
        if (match && match[1] && !match[1].includes('data:image')) {
          imageUrl = match[1];
          break;
        }
      }
    }

    // Check availability
    const isAvailable = !html.includes('Out of stock') && 
                       !html.includes('Currently unavailable') &&
                       !html.includes('Sold out');

    if (!price) {
      throw new Error('Could not extract price from Ajio page');
    }

    console.log('Ajio scraped:', { name: name.substring(0, 50), price, hasImage: imageUrl !== 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop' });

    return { name, price, imageUrl, isAvailable };
  } catch (error) {
    console.error('Error scraping Ajio:', error);
    throw new Error(`Failed to scrape Ajio: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function checkPriceAlerts(supabaseClient: any, productId: string, newPrice: number) {
  console.log(`Checking price alerts for product ${productId} at price ${newPrice}`);
  
  const { data: trackers, error } = await supabaseClient
    .from('trackers')
    .select('id, user_id, target_price')
    .eq('product_id', productId)
    .eq('is_active', true)
    .not('target_price', 'is', null);

  if (error) {
    console.error('Error fetching trackers:', error);
    return;
  }

  for (const tracker of trackers || []) {
    if (newPrice <= tracker.target_price) {
      console.log(`Price alert condition met for tracker ${tracker.id}`);
      
      const { error: alertError } = await supabaseClient
        .from('alerts')
        .insert({
          user_id: tracker.user_id,
          tracker_id: tracker.id,
          old_price: tracker.target_price,
          new_price: newPrice,
          status: 'PENDING',
        });

      if (alertError) {
        console.error('Error creating alert:', alertError);
      } else {
        console.log(`Created alert for tracker ${tracker.id}`);
      }
    }
  }
}
