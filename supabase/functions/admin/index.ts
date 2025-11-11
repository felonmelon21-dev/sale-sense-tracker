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

    // Get total users
    const { count: totalUsers } = await supabaseClient
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get total active trackers
    const { count: totalTrackers } = await supabaseClient
      .from('trackers')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get total products
    const { count: totalProducts } = await supabaseClient
      .from('products')
      .select('*', { count: 'exact', head: true });

    // Get recent scrape logs
    const { data: recentScrapes } = await supabaseClient
      .from('scrape_logs')
      .select('*, products(name, platform)')
      .order('scraped_at', { ascending: false })
      .limit(10);

    // Get failed scrapes count (last 24 hours)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { count: failedScrapes } = await supabaseClient
      .from('scrape_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'FAILED')
      .gte('scraped_at', twentyFourHoursAgo.toISOString());

    // Get total savings (sum of price differences)
    const { data: alerts } = await supabaseClient
      .from('alerts')
      .select('old_price, new_price');

    let totalSavings = 0;
    if (alerts) {
      totalSavings = alerts.reduce((sum, alert) => {
        return sum + ((alert.old_price || 0) - alert.new_price);
      }, 0);
    }

    return new Response(
      JSON.stringify({
        totalUsers: totalUsers || 0,
        totalTrackers: totalTrackers || 0,
        totalProducts: totalProducts || 0,
        recentScrapes: recentScrapes || [],
        failedScrapes: failedScrapes || 0,
        totalSavings: Math.round(totalSavings * 100) / 100,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in admin function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
