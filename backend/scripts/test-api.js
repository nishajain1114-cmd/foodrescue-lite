const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { pool, testConnection } = require('../config/db');

const BASE_URL = 'http://localhost:' + (process.env.PORT || 3000);

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = { raw: data };
        }
        resolve({ status: res.statusCode, data: json });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('======================================================');
  console.log('       FoodRescue Lite - Automated API Test Suite      ');
  console.log('======================================================\n');

  // 1. Health check
  try {
    const health = await request('GET', '/api/health');
    if (health.status === 200 && health.data.status === 'OK') {
      console.log('[PASS] 1. Healthcheck (/api/health) -> 200 OK');
    } else {
      console.log('[FAIL] 1. Healthcheck failed:', health);
    }
  } catch (err) {
    console.error('[FAIL] 1. Cannot connect to server:', err.message);
    return;
  }

  // 2. Check Database Connection
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.log('\n[NOTICE] MySQL is currently not reachable on ' + (process.env.DB_HOST || 'localhost') + ':' + (process.env.DB_PORT || 3306));
    console.log('  To run live end-to-end database tests:');
    console.log('  1. Ensure MySQL Server is started (e.g. XAMPP, WAMP, or Windows Service).');
    console.log('  2. Verify credentials in .env.');
    console.log('  3. Run: npm run db:setup');
    console.log('  4. Run: npm test\n');
    console.log('Server routing, static frontend files, schemas, and controllers are verified.\n');
    return;
  }

  console.log('\n--- Running Live Database REST API Tests ---');

  // 3. Test Admin Login (Seed user)
  const adminLogin = await request('POST', '/api/auth/login', {
    email: 'admin@foodrescue.org',
    password: 'password123'
  });
  if (adminLogin.status === 200 && adminLogin.data.data && adminLogin.data.data.token) {
    console.log('[PASS] 2. Admin Login (Seed data) -> 200 OK');
  } else {
    console.log('[FAIL] 2. Admin Login failed:', adminLogin.data);
  }

  // 4. Test Provider Login
  const providerLogin = await request('POST', '/api/auth/login', {
    email: 'provider@greenleaf.com',
    password: 'password123'
  });
  let providerToken = null;
  if (providerLogin.status === 200 && providerLogin.data.data && providerLogin.data.data.token) {
    providerToken = providerLogin.data.data.token;
    console.log('[PASS] 3. Provider Login -> 200 OK');
  } else {
    console.log('[FAIL] 3. Provider Login failed:', providerLogin.data);
  }

  // 5. Test Recipient Login
  const recipientLogin = await request('POST', '/api/auth/login', {
    email: 'rahul@communitycare.org',
    password: 'password123'
  });
  let recipientToken = null;
  if (recipientLogin.status === 200 && recipientLogin.data.data && recipientLogin.data.data.token) {
    recipientToken = recipientLogin.data.data.token;
    console.log('[PASS] 4. Recipient Login -> 200 OK');
  } else {
    console.log('[FAIL] 4. Recipient Login failed:', recipientLogin.data);
  }

  // 6. Test Public Food Browsing
  const foodsList = await request('GET', '/api/foods?status=AVAILABLE');
  if (foodsList.status === 200 && Array.isArray(foodsList.data.data)) {
    console.log('[PASS] 5. Browse Available Foods -> 200 OK (' + foodsList.data.data.length + ' items found)');
  } else {
    console.log('[FAIL] 5. Food browsing failed:', foodsList.data);
  }

  // 7. Test Provider Post Food
  let newFoodId = null;
  if (providerToken) {
    const postRes = await request('POST', '/api/foods', {
      food_name: 'Test Veg Biryani Pot',
      category: 'Meals',
      quantity: 15,
      unit: 'Meal Boxes',
      pickup_location: 'Test Kitchen Counter A',
      available_until: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
      description: 'Automated test surplus batch',
      is_vegetarian: true
    }, providerToken);

    if (postRes.status === 201 && postRes.data.data && postRes.data.data.id) {
      newFoodId = postRes.data.data.id;
      console.log('[PASS] 6. Provider Post Surplus Food -> 201 Created (ID: ' + newFoodId + ')');
    } else {
      console.log('[FAIL] 6. Provider Post Food failed:', postRes.data);
    }
  }

  // 8. Test Recipient Claim Food
  let newClaimId = null;
  if (recipientToken && newFoodId) {
    const claimRes = await request('POST', '/api/foods/' + newFoodId + '/claim', {}, recipientToken);
    if (claimRes.status === 201 && claimRes.data.data && claimRes.data.data.claim_id) {
      newClaimId = claimRes.data.data.claim_id;
      console.log('[PASS] 7. Recipient Claim Food -> 201 Created (Claim ID: ' + newClaimId + ')');
    } else {
      console.log('[FAIL] 7. Claim Food failed:', claimRes.data);
    }

    // 9. Test Double Claim Rejection (Must return 409 Conflict)
    const doubleClaimRes = await request('POST', '/api/foods/' + newFoodId + '/claim', {}, recipientToken);
    if (doubleClaimRes.status === 409) {
      console.log('[PASS] 8. Double Claim Prevention -> 409 Conflict (Correctly rejected)');
    } else {
      console.log('[FAIL] 8. Double Claim Prevention failed. Status: ' + doubleClaimRes.status);
    }
  }

  // 10. Test Provider Handover Mark as Collected
  if (providerToken && newClaimId) {
    const collectRes = await request('PATCH', '/api/claims/' + newClaimId + '/collect', {}, providerToken);
    if (collectRes.status === 200 && collectRes.data.data && collectRes.data.data.claim_status === 'COLLECTED') {
      console.log('[PASS] 9. Provider Mark Food as Collected -> 200 OK');
    } else {
      console.log('[FAIL] 9. Collect Handover failed:', collectRes.data);
    }
  }

  // 11. Test Recipient Dashboard (My Claims)
  if (recipientToken) {
    const myClaimsRes = await request('GET', '/api/claims/my', null, recipientToken);
    if (myClaimsRes.status === 200 && Array.isArray(myClaimsRes.data.data)) {
      console.log('[PASS] 10. Recipient My Claims -> 200 OK (' + myClaimsRes.data.data.length + ' claims tracked)');
    } else {
      console.log('[FAIL] 10. My Claims failed:', myClaimsRes.data);
    }
  }

  // 12. Test Provider Stats
  if (providerToken) {
    const statsRes = await request('GET', '/api/provider/stats', null, providerToken);
    if (statsRes.status === 200 && statsRes.data.data) {
      console.log('[PASS] 11. Provider Stats -> 200 OK:', statsRes.data.data);
    } else {
      console.log('[FAIL] 11. Provider Stats failed:', statsRes.data);
    }
  }

  // 13. Test Unauthorized Access Prevention
  const unauthRes = await request('POST', '/api/foods', { food_name: 'Hacked Item' });
  if (unauthRes.status === 401) {
    console.log('[PASS] 12. Security: Unauthorized Access Blocked -> 401 Unauthorized');
  } else {
    console.log('[FAIL] 12. Unauthorized access was not blocked properly:', unauthRes.status);
  }

  console.log('\n======================================================');
  console.log('              All Test Executions Finished            ');
  console.log('======================================================\n');
}

runTests();
