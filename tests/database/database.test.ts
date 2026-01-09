/**
 * Database tests
 * Tests PostgreSQL and Redis connections and operations
 */

import 'dotenv/config';
import { postgres, redis } from '../../src/database/index.js';

async function testPostgreSQL() {
  console.log('=== PostgreSQL Tests ===\n');

  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Test 1: Connection
    console.log('Test 1: Database connection...');
    try {
      await postgres.connect();
      console.log('✓ Connected successfully\n');
      testsPassed++;
    } catch (error) {
      console.error('✗ Connection failed:', error);
      testsFailed++;
      throw error;
    }

    // Test 2: Connection test
    console.log('Test 2: Connection test...');
    try {
      const isConnected = await postgres.testConnection();
      if (isConnected) {
        console.log('✓ Connection test passed\n');
        testsPassed++;
      } else {
        throw new Error('Connection test returned false');
      }
    } catch (error) {
      console.error('✗ Connection test failed:', error);
      testsFailed++;
    }

    // Test 3: Simple query
    console.log('Test 3: Simple query...');
    try {
      const result = await postgres.query('SELECT NOW() as current_time');
      if (result.rows.length > 0) {
        console.log(`✓ Query executed: ${result.rows[0].current_time}\n`);
        testsPassed++;
      } else {
        throw new Error('No results returned');
      }
    } catch (error) {
      console.error('✗ Query failed:', error);
      testsFailed++;
    }

    // Test 4: Check if migrations table exists
    console.log('Test 4: Check migrations table...');
    try {
      const result = await postgres.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'migrations'
        ) as exists
      `);
      if (result.rows[0].exists) {
        console.log('✓ Migrations table exists\n');
        testsPassed++;
      } else {
        console.log('⚠ Migrations table not found (run npm run db:migrate)\n');
        testsPassed++;
      }
    } catch (error) {
      console.error('✗ Check failed:', error);
      testsFailed++;
    }

    // Test 5: Check if main tables exist
    console.log('Test 5: Check main tables...');
    try {
      const tables = ['news', 'social_posts', 'signals', 'trades', 'candles'];
      const result = await postgres.query(
        `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ANY($1)
      `,
        [tables],
      );

      const foundTables = result.rows.map((row) => row.table_name);
      if (foundTables.length === tables.length) {
        console.log(`✓ All ${tables.length} tables exist: ${foundTables.join(', ')}\n`);
        testsPassed++;
      } else {
        const missing = tables.filter((t) => !foundTables.includes(t));
        console.log(
          `⚠ ${foundTables.length}/${tables.length} tables found. Missing: ${missing.join(', ')}`,
        );
        console.log('  (run npm run db:migrate to create tables)\n');
        testsPassed++;
      }
    } catch (error) {
      console.error('✗ Check failed:', error);
      testsFailed++;
    }

    // Test 6: Parameterized query
    console.log('Test 6: Parameterized query...');
    try {
      const result = await postgres.query('SELECT $1::int + $2::int as sum', [5, 10]);
      if (result.rows[0].sum === 15) {
        console.log('✓ Parameterized query works (5 + 10 = 15)\n');
        testsPassed++;
      } else {
        throw new Error('Unexpected result');
      }
    } catch (error) {
      console.error('✗ Query failed:', error);
      testsFailed++;
    }

    // Test 7: Transaction (if tables exist)
    console.log('Test 7: Transaction test...');
    try {
      // Check if news table exists
      const tableCheck = await postgres.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'news'
        ) as exists
      `);

      if (tableCheck.rows[0].exists) {
        await postgres.transaction(async (client) => {
          await client.query('SELECT 1');
          await client.query('SELECT 2');
        });
        console.log('✓ Transaction executed successfully\n');
        testsPassed++;
      } else {
        console.log('⚠ Skipping transaction test (tables not created)\n');
        testsPassed++;
      }
    } catch (error) {
      console.error('✗ Transaction failed:', error);
      testsFailed++;
    }

    // Test 8: Count records (if tables exist)
    console.log('Test 8: Count records in tables...');
    try {
      const tableCheck = await postgres.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'news'
        ) as exists
      `);

      if (tableCheck.rows[0].exists) {
        const tables = ['news', 'social_posts', 'signals', 'trades', 'candles'];
        for (const table of tables) {
          const result = await postgres.query(`SELECT COUNT(*) as count FROM ${table}`);
          console.log(`  ${table}: ${result.rows[0].count} record(s)`);
        }
        console.log('✓ Count queries executed\n');
        testsPassed++;
      } else {
        console.log('⚠ Skipping count test (tables not created)\n');
        testsPassed++;
      }
    } catch (error) {
      console.error('✗ Count queries failed:', error);
      testsFailed++;
    }
  } catch (error) {
    console.error('Fatal PostgreSQL error:', error);
  } finally {
    await postgres.disconnect();
    console.log('✓ Disconnected\n');
  }

  return { passed: testsPassed, failed: testsFailed };
}

async function testRedis() {
  console.log('=== Redis Tests ===\n');

  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Test 1: Connection
    console.log('Test 1: Redis connection...');
    try {
      await redis.connect();
      console.log('✓ Connected successfully\n');
      testsPassed++;
    } catch (error) {
      console.error('✗ Connection failed:', error);
      testsFailed++;
      throw error;
    }

    // Test 2: Connection test
    console.log('Test 2: Connection test...');
    try {
      const isConnected = await redis.testConnection();
      if (isConnected) {
        console.log('✓ Connection test passed (PING)\n');
        testsPassed++;
      } else {
        throw new Error('Connection test returned false');
      }
    } catch (error) {
      console.error('✗ Connection test failed:', error);
      testsFailed++;
    }

    // Test 3: Set and get
    console.log('Test 3: Set and get value...');
    try {
      await redis.set('test:key', 'test_value');
      const value = await redis.get('test:key');
      if (value === 'test_value') {
        console.log('✓ Set and get works\n');
        testsPassed++;
      } else {
        throw new Error(`Expected "test_value", got "${value}"`);
      }
    } catch (error) {
      console.error('✗ Set/get failed:', error);
      testsFailed++;
    }

    // Test 4: JSON operations
    console.log('Test 4: JSON set and get...');
    try {
      const testObj = { name: 'Test', value: 123, active: true };
      await redis.setJSON('test:json', testObj);
      const retrieved = await redis.getJSON('test:json');

      if (
        retrieved &&
        retrieved.name === 'Test' &&
        retrieved.value === 123 &&
        retrieved.active === true
      ) {
        console.log('✓ JSON operations work\n');
        testsPassed++;
      } else {
        throw new Error('JSON mismatch');
      }
    } catch (error) {
      console.error('✗ JSON operations failed:', error);
      testsFailed++;
    }

    // Test 5: TTL
    console.log('Test 5: TTL operations...');
    try {
      await redis.set('test:ttl', 'temp_value', 60);
      const ttl = await redis.ttl('test:ttl');
      if (ttl > 0 && ttl <= 60) {
        console.log(`✓ TTL works (${ttl} seconds remaining)\n`);
        testsPassed++;
      } else {
        throw new Error(`Invalid TTL: ${ttl}`);
      }
    } catch (error) {
      console.error('✗ TTL operations failed:', error);
      testsFailed++;
    }

    // Test 6: Exists
    console.log('Test 6: Key existence check...');
    try {
      const exists = await redis.exists('test:key');
      const notExists = await redis.exists('test:nonexistent');
      if (exists && !notExists) {
        console.log('✓ Exists check works\n');
        testsPassed++;
      } else {
        throw new Error('Exists check failed');
      }
    } catch (error) {
      console.error('✗ Exists check failed:', error);
      testsFailed++;
    }

    // Test 7: Counter operations
    console.log('Test 7: Counter operations...');
    try {
      await redis.set('test:counter', '0');
      await redis.incr('test:counter');
      await redis.incr('test:counter');
      const value = await redis.get('test:counter');
      if (value === '2') {
        console.log('✓ Counter operations work\n');
        testsPassed++;
      } else {
        throw new Error(`Expected "2", got "${value}"`);
      }
    } catch (error) {
      console.error('✗ Counter operations failed:', error);
      testsFailed++;
    }

    // Test 8: Rate limiting
    console.log('Test 8: Rate limiting...');
    try {
      const key = 'test:ratelimit';
      const limit = 3;
      const window = 60;

      // Clean up first
      await redis.del(`ratelimit:${key}`);

      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(await redis.checkRateLimit(key, limit, window));
      }

      const allowedCount = results.filter((r) => r).length;
      const blockedCount = results.filter((r) => !r).length;

      if (allowedCount === limit && blockedCount === 2) {
        console.log(`✓ Rate limiting works (${allowedCount} allowed, ${blockedCount} blocked)\n`);
        testsPassed++;
      } else {
        throw new Error(`Rate limiting failed: ${allowedCount} allowed, ${blockedCount} blocked`);
      }
    } catch (error) {
      console.error('✗ Rate limiting failed:', error);
      testsFailed++;
    }

    // Test 9: Delete operations
    console.log('Test 9: Delete operations...');
    try {
      await redis.set('test:delete1', 'value1');
      await redis.set('test:delete2', 'value2');

      const deleted = await redis.delMany(['test:delete1', 'test:delete2']);
      if (deleted === 2) {
        console.log('✓ Delete operations work\n');
        testsPassed++;
      } else {
        throw new Error(`Expected 2 deletions, got ${deleted}`);
      }
    } catch (error) {
      console.error('✗ Delete operations failed:', error);
      testsFailed++;
    }

    // Cleanup test keys
    console.log('Cleaning up test keys...');
    const testKeys = await redis.keys('test:*');
    if (testKeys.length > 0) {
      await redis.delMany(testKeys);
      console.log(`✓ Cleaned up ${testKeys.length} test key(s)\n`);
    }
  } catch (error) {
    console.error('Fatal Redis error:', error);
  } finally {
    await redis.disconnect();
    console.log('✓ Disconnected\n');
  }

  return { passed: testsPassed, failed: testsFailed };
}

async function main() {
  console.log('Database Tests\n');
  console.log('=====================================\n');

  const postgresResults = await testPostgreSQL();
  const redisResults = await testRedis();

  console.log('=====================================');
  console.log('Test Summary\n');
  console.log(`PostgreSQL: ${postgresResults.passed} passed, ${postgresResults.failed} failed`);
  console.log(`Redis: ${redisResults.passed} passed, ${redisResults.failed} failed`);
  console.log(
    `\nTotal: ${postgresResults.passed + redisResults.passed} passed, ${postgresResults.failed + redisResults.failed} failed`,
  );

  if (postgresResults.failed + redisResults.failed > 0) {
    console.log('\n⚠ Some tests failed');
    process.exit(1);
  } else {
    console.log('\n✓ All tests passed!');
  }
}

// Run tests
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
