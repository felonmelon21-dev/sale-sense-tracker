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

    console.log('Starting alert check...');

    // Get all active trackers with target prices
    const { data: trackers, error: trackersError } = await supabaseClient
      .from('trackers')
      .select(`
        id,
        user_id,
        target_price,
        product_id,
        products (
          id,
          name,
          latest_price,
          url,
          currency
        ),
        profiles!inner (
          email
        )
      `)
      .eq('is_active', true)
      .not('target_price', 'is', null);

    if (trackersError) throw trackersError;

    console.log(`Found ${trackers?.length || 0} active trackers with target prices`);

    let alertsSent = 0;
    let errors = 0;

    for (const tracker of trackers || []) {
      try {
        const product = tracker.products as any;
        const profile = (tracker.profiles as any[])[0];
        
        // Check if current price is at or below target price
        if (product.latest_price <= tracker.target_price) {
          console.log(`Price alert triggered for ${product.name}: ${product.latest_price} <= ${tracker.target_price}`);

          // Get previous price from price_snapshots
          const { data: previousSnapshot } = await supabaseClient
            .from('price_snapshots')
            .select('price')
            .eq('product_id', product.id)
            .order('snapshot_at', { ascending: false })
            .limit(2);

          const oldPrice = previousSnapshot && previousSnapshot.length > 1 
            ? previousSnapshot[1].price 
            : tracker.target_price;

          // Create alert record
          const { error: alertError } = await supabaseClient
            .from('alerts')
            .insert({
              user_id: tracker.user_id,
              tracker_id: tracker.id,
              old_price: oldPrice,
              new_price: product.latest_price,
              status: 'SENT',
            });

          if (alertError) {
            console.error('Error creating alert:', alertError);
            continue;
          }

          // Send email notification
          const emailResult = await supabaseClient.functions.invoke('send-email', {
            body: {
              to: profile.email,
              productName: product.name,
              oldPrice: oldPrice,
              newPrice: product.latest_price,
              productUrl: product.url,
              currency: product.currency || 'INR',
            },
          });

          if (emailResult.error) {
            console.error('Error sending email:', emailResult.error);
            errors++;
          } else {
            console.log(`Alert email sent to ${profile.email}`);
            alertsSent++;
          }
        }
      } catch (err) {
        console.error('Error processing tracker:', err);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Checked ${trackers?.length || 0} trackers, sent ${alertsSent} alerts`,
        alertsSent,
        errors,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in check-alerts function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
