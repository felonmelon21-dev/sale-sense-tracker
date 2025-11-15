import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateTrackerRequest {
  productUrl: string;
  targetPrice?: number;
}

// Validation schema for creating trackers
const CreateTrackerSchema = z.object({
  productUrl: z.string()
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
    }, { message: 'Unsupported platform. Only Amazon, Flipkart, Myntra, Ajio, and Snapdeal are supported.' }),
  targetPrice: z.number()
    .positive({ message: 'Price must be positive' })
    .max(10000000, { message: 'Price exceeds maximum allowed value' })
    .optional()
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role for database operations
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
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Authenticated user:', user.id);

    // GET - List all trackers for the user
    if (req.method === 'GET') {
      const { data: trackers, error } = await supabaseAdmin
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
      const requestBody = await req.json();
      
      // Validate input
      const parseResult = CreateTrackerSchema.safeParse(requestBody);
      if (!parseResult.success) {
        return new Response(JSON.stringify({ 
          error: 'Validation failed', 
          details: parseResult.error.issues 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const { productUrl, targetPrice } = parseResult.data;

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
      const { data: existingProduct } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('url', productUrl)
        .single();

      let productId: string;

      if (existingProduct) {
        productId = existingProduct.id;
        console.log('Product already exists:', productId);
        
        // Re-scrape if product data looks incomplete
        if (existingProduct.name === 'Product loading...' || existingProduct.latest_price === 0) {
          console.log('Product data incomplete, re-triggering scraping');
          const scrapeResult = await supabaseAdmin.functions.invoke('scraper', {
            body: { productId, url: productUrl, platform },
          });
          
          if (scrapeResult.error) {
            console.error('Re-scraping failed:', scrapeResult.error);
          }
        }
      } else {
        // Create new product (scraping will happen in background)
        const { data: newProduct, error: productError } = await supabaseAdmin
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

        // Trigger scraping immediately and wait for it
        console.log('Invoking scraper for product:', productId);
        const scrapeResult = await supabaseAdmin.functions.invoke('scraper', {
          body: { productId, url: productUrl, platform },
        });
        
        if (scrapeResult.error) {
          console.error('Scraping failed:', scrapeResult.error);
          // Don't fail the tracker creation, just log the error
        } else {
          console.log('Scraping completed successfully');
        }
      }

      // Check if tracker already exists
      const { data: existingTracker } = await supabaseAdmin
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
      const { data: tracker, error: trackerError } = await supabaseAdmin
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
      const { id: trackerId } = await req.json();

      if (!trackerId) {
        return new Response(JSON.stringify({ error: 'Tracker ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Deleting tracker:', trackerId, 'for user:', user.id);

      const { error } = await supabaseAdmin
        .from('trackers')
        .delete()
        .eq('id', trackerId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }

      console.log('Tracker deleted successfully');

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
