// Supabase Edge Function: Secure Steadfast Courier Proxy
// Deploy via: supabase functions deploy steadfast-proxy
// Set secrets: supabase secrets set STEADFAST_API_KEY=... STEADFAST_SECRET_KEY=...

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STEADFAST_BASE = 'https://portal.packzy.com/api/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function sanitizeSteadfastText(input: string, maxLen: number): string {
  return String(input || '')
    .replace(/[{<>};$]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: adminRow } = await adminClient
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!adminRow) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('STEADFAST_API_KEY');
    const secretKey = Deno.env.get('STEADFAST_SECRET_KEY');
    if (!apiKey || !secretKey) {
      return new Response(
        JSON.stringify({ error: 'STEADFAST_API_KEY and STEADFAST_SECRET_KEY are not configured in Supabase Secrets.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action, orderId, consignmentId, phone } = body;

    const sfHeaders = {
      'Api-Key': apiKey,
      'Secret-Key': secretKey,
      'Content-Type': 'application/json',
    };

    if (action === 'ping') {
      const res = await fetch(`${STEADFAST_BASE}/ping`, { headers: sfHeaders });
      const data = await res.json();
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'balance') {
      const res = await fetch(`${STEADFAST_BASE}/get_balance`, { headers: sfHeaders });
      const data = await res.json();
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'fraud_check' && phone) {
      const safePhone = sanitizeSteadfastText(phone, 40);
      const res = await fetch(`${STEADFAST_BASE}/fraud_check/score/${encodeURIComponent(safePhone)}`, { headers: sfHeaders });
      const data = await res.json();
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'status' && consignmentId) {
      const res = await fetch(`${STEADFAST_BASE}/status_by_cid/${encodeURIComponent(String(consignmentId))}`, { headers: sfHeaders });
      const data = await res.json();
      if (res.ok && data?.delivery_status && orderId) {
        await adminClient
          .from('orders')
          .update({ steadfast_status: data.delivery_status, updated_at: new Date().toISOString() })
          .eq('id', orderId);
      }
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'create_order' && orderId) {
      const { data: order, error: ordErr } = await adminClient
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (ordErr || !order) {
        return new Response(JSON.stringify({ error: 'Order not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (order.steadfast_consignment_id) {
        return new Response(
          JSON.stringify({ error: 'Order already dispatched to Steadfast', consignment_id: order.steadfast_consignment_id }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const itemsSummary = Array.isArray(order.items)
        ? order.items.map((i: { name: string; color?: string; size?: string; quantity: number }) =>
            `${i.name} (${i.color || ''}/${i.size || ''}) x${i.quantity}`
          ).join(', ')
        : '';

      const payload = {
        invoice: sanitizeSteadfastText(order.order_number, 100),
        recipient_name: sanitizeSteadfastText(order.customer_name, 100),
        recipient_phone: sanitizeSteadfastText(order.customer_phone, 40),
        recipient_address: sanitizeSteadfastText(order.customer_address, 490),
        cod_amount: Math.round(Number(order.total_amount) || 0),
        note: sanitizeSteadfastText(`${order.notes ? order.notes + ' | ' : ''}${itemsSummary}`, 480),
      };

      const sfRes = await fetch(`${STEADFAST_BASE}/create_order`, {
        method: 'POST',
        headers: sfHeaders,
        body: JSON.stringify(payload),
      });
      const sfJson = await sfRes.json();

      if (!sfRes.ok || sfJson.status !== 200 || !sfJson.consignment) {
        return new Response(JSON.stringify({ error: sfJson.message || 'Steadfast submission failed', details: sfJson }), {
          status: sfRes.status >= 400 ? sfRes.status : 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const consignment = sfJson.consignment;
      const { data: updated, error: updErr } = await adminClient
        .from('orders')
        .update({
          steadfast_consignment_id: consignment.consignment_id,
          steadfast_tracking_code: consignment.tracking_code,
          steadfast_status: consignment.status || 'in_review',
          steadfast_sent_at: new Date().toISOString(),
          steadfast_raw: consignment,
          status: order.status === 'pending' ? 'shipped' : order.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)
        .select('*')
        .single();

      if (updErr) {
        return new Response(JSON.stringify({ error: updErr.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ order: updated, consignment }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unsupported action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
