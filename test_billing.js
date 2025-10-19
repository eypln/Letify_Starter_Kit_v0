const { createClient } = require('@supabase/supabase-js');
const http = require('http');
require('dotenv').config({ path: '.env.local' });

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

async function testDuplicatePrevention() {
  const mockEvent = {
    'id': 'evt_test_duplicate_2',
    'type': 'checkout.session.completed',
    'data': {
      'object': {
        'id': 'cs_test_duplicate_2',
        'mode': 'payment',
        'amount_total': 500,
        'customer': 'cus_TC8kj0NR2sAIRp',
        'metadata': {
          'user_id': '9bd6f7bc-0041-4c8c-8c48-c4726b7ed008',
          'credit_amount': '25',
          'type': 'credits'
        },
        'client_reference_id': '9bd6f7bc-0041-4c8c-8c48-c4726b7ed008',
        'payment_intent': 'pi_3SJzaCJWqqH93One19cjmd44', // Same as before
        'status': 'complete'
      }
    }
  };

  console.log('Testing duplicate prevention...');

  const data = JSON.stringify(mockEvent);
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/stripe/webhook',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': 't=1234567890,v1=test_signature'
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log('Response status:', res.statusCode);
        console.log('Response body:', body);
        resolve();
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTest() {
  console.log('Credits before test:', (await supa.from('billing_customers').select('credits').eq('user_id', '9bd6f7bc-0041-4c8c-8c48-c4726b7ed008').single()).data?.credits);

  await testDuplicatePrevention();

  console.log('Credits after test:', (await supa.from('billing_customers').select('credits').eq('user_id', '9bd6f7bc-0041-4c8c-8c48-c4726b7ed008').single()).data?.credits);
}

runTest();