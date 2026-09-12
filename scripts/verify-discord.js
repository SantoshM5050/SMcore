const fs = require('fs');
const path = require('path');
const https = require('https');

// Read root .env file manually if dotenv is not globally loaded
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

function fetchDiscord(endpoint, token) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      `https://discord.com/api/v10${endpoint}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bot ${token}`,
          'User-Agent': 'SMCore-Discord-Checker/1.0.0',
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, data: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function verify() {
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('              SMCORE DISCORD CREDENTIALS & TOKEN CHECKER                       ');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  const clientId = (process.env.DISCORD_CLIENT_ID || '').trim().replace(/^["']|["']$/g, '');
  const clientSecret = (process.env.DISCORD_CLIENT_SECRET || '').trim().replace(/^["']|["']$/g, '');
  const botToken = (process.env.DISCORD_BOT_TOKEN || '').trim().replace(/^["']|["']$/g, '');
  const redirectUri = (process.env.DISCORD_REDIRECT_URI || '').trim().replace(/^["']|["']$/g, '');

  let hasErrors = false;

  console.log('1. Checking Environment Variables in .env:');

  // Check 1: DISCORD_BOT_TOKEN
  if (!botToken) {
    console.log('  ❌ DISCORD_BOT_TOKEN: MISSING (Not defined in .env)');
    hasErrors = true;
  } else if (botToken === 'YOUR_DISCORD_BOT_TOKEN') {
    console.log('  ❌ DISCORD_BOT_TOKEN: PLACEHOLDER (Still set to "YOUR_DISCORD_BOT_TOKEN")');
    hasErrors = true;
  } else {
    console.log(`  ✅ DISCORD_BOT_TOKEN: Set (${botToken.substring(0, 6)}...${botToken.substring(botToken.length - 4)}, length ${botToken.length})`);
  }

  // Check 2: DISCORD_CLIENT_ID
  if (!clientId) {
    console.log('  ❌ DISCORD_CLIENT_ID: MISSING (Not defined in .env)');
    hasErrors = true;
  } else if (clientId === 'YOUR_DISCORD_CLIENT_ID') {
    console.log('  ❌ DISCORD_CLIENT_ID: PLACEHOLDER (Still set to "YOUR_DISCORD_CLIENT_ID")');
    hasErrors = true;
  } else if (!/^\d{17,20}$/.test(clientId)) {
    console.log(`  ⚠️ DISCORD_CLIENT_ID: Unexpected format "${clientId}" (Discord IDs are typically 17-20 digits)`);
  } else {
    console.log(`  ✅ DISCORD_CLIENT_ID: Set (${clientId})`);
  }

  // Check 3: DISCORD_CLIENT_SECRET
  if (!clientSecret) {
    console.log('  ❌ DISCORD_CLIENT_SECRET: MISSING (Not defined in .env)');
    hasErrors = true;
  } else if (clientSecret === 'YOUR_DISCORD_CLIENT_SECRET') {
    console.log('  ❌ DISCORD_CLIENT_SECRET: PLACEHOLDER (Still set to "YOUR_DISCORD_CLIENT_SECRET")');
    hasErrors = true;
  } else {
    console.log(`  ✅ DISCORD_CLIENT_SECRET: Set (${clientSecret.substring(0, 4)}...${clientSecret.substring(clientSecret.length - 4)})`);
  }

  // Check 4: DISCORD_REDIRECT_URI
  if (!redirectUri) {
    console.log('  ⚠️ DISCORD_REDIRECT_URI: Missing (will default to http://localhost:3000/api/auth/callback)');
  } else {
    console.log(`  ✅ DISCORD_REDIRECT_URI: Set (${redirectUri})`);
  }

  console.log('\n2. Testing Discord Gateway / REST API Connection:');

  if (botToken && botToken !== 'YOUR_DISCORD_BOT_TOKEN') {
    try {
      const { status, data } = await fetchDiscord('/users/@me', botToken);
      if (status === 200 && data && data.id) {
        console.log(`  ✅ Discord REST API Authentication SUCCESSFUL!`);
        console.log(`     • Bot User: ${data.username}${data.discriminator && data.discriminator !== '0' ? '#' + data.discriminator : ''}`);
        console.log(`     • Bot User ID: ${data.id}`);
        console.log(`     • Verified Bot: ${data.verified ? 'Yes' : 'No'}`);

        if (clientId && clientId !== data.id) {
          console.log(`  ⚠️ NOTE: DISCORD_CLIENT_ID (${clientId}) does not match Bot User ID (${data.id}). Make sure they belong to the same Discord Application.`);
        }
      } else if (status === 401) {
        console.log(`  ❌ Discord REST API: 401 UNAUTHORIZED`);
        console.log(`     The DISCORD_BOT_TOKEN provided is invalid or was reset in the Discord Developer Portal.`);
        hasErrors = true;
      } else {
        console.log(`  ❌ Discord REST API returned HTTP ${status}:`, data);
        hasErrors = true;
      }
    } catch (netErr) {
      console.log(`  ❌ Network Error connecting to Discord API: ${netErr.message}`);
      hasErrors = true;
    }
  } else {
    console.log('  ⏭️  Skipping Discord REST API test because DISCORD_BOT_TOKEN is not yet set.');
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════════');
  if (hasErrors) {
    console.log('STATUS: ❌ REQUIRED DISCORD CREDENTIALS ARE NOT YET SET');
    console.log('Follow these steps in the Discord Developer Portal (https://discord.com/developers/applications):\n');
    console.log('1. Open your Application (or create a new one).');
    console.log('2. In "General Information": Copy "APPLICATION ID" -> paste into DISCORD_CLIENT_ID in .env');
    console.log('3. In "OAuth2": Reset and copy "CLIENT SECRET" -> paste into DISCORD_CLIENT_SECRET in .env');
    console.log('   Add Redirect: http://localhost:3000/api/auth/callback');
    console.log('4. In "Bot": Click "Reset Token" and copy -> paste into DISCORD_BOT_TOKEN in .env');
    console.log('5. In "Bot" -> "Privileged Gateway Intents": Enable:');
    console.log('   ☑️ PRESENCE INTENT');
    console.log('   ☑️ SERVER MEMBERS INTENT');
    console.log('   ☑️ MESSAGE CONTENT INTENT');
    console.log('   Then click "Save Changes".');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    process.exit(1);
  } else {
    console.log('STATUS: ✅ ALL DISCORD CREDENTIALS ARE VALID AND OPERATIONAL');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    process.exit(0);
  }
}

verify();
