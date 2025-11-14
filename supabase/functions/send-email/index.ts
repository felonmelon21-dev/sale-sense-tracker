import { Resend } from 'https://esm.sh/resend@4.0.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  to: string;
  productName: string;
  oldPrice: number;
  newPrice: number;
  productUrl: string;
  currency: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, productName, oldPrice, newPrice, productUrl, currency }: EmailRequest = await req.json();

    const savings = oldPrice - newPrice;
    const savingsPercent = Math.round((savings / oldPrice) * 100);

    const emailResponse = await resend.emails.send({
      from: 'Saleor <onboarding@resend.dev>',
      to: [to],
      subject: `🎉 Price Drop Alert: ${productName} is now ${currency} ${newPrice}!`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
              .header h1 { color: white; margin: 0; font-size: 24px; }
              .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
              .price-box { background: #f0fdfa; border: 2px solid #14b8a6; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
              .old-price { text-decoration: line-through; color: #6b7280; font-size: 18px; }
              .new-price { color: #14b8a6; font-size: 32px; font-weight: bold; margin: 10px 0; }
              .savings { color: #059669; font-size: 18px; font-weight: 600; }
              .button { display: inline-block; background: #0891b2; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Price Drop Alert!</h1>
              </div>
              <div class="content">
                <h2>${productName}</h2>
                <p>Great news! The price has dropped on a product you're tracking.</p>
                
                <div class="price-box">
                  <div class="old-price">Was: ${currency} ${oldPrice.toFixed(2)}</div>
                  <div class="new-price">${currency} ${newPrice.toFixed(2)}</div>
                  <div class="savings">You save: ${currency} ${savings.toFixed(2)} (${savingsPercent}% off)</div>
                </div>
                
                <p style="text-align: center;">
                  <a href="${productUrl}" class="button">View Product</a>
                </p>
                
                <p style="color: #6b7280; font-size: 14px;">
                  This is an automated alert from Saleor. You're receiving this because you set a price tracker for this product.
                </p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Saleor - Smart Price Tracking</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log('Email sent successfully:', emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
