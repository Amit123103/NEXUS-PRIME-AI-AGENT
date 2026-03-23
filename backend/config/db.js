const { db } = require('@vercel/postgres');

const connectDB = async () => {
  try {
    const client = await db.connect();
    console.log('✅ Vercel Postgres Connected');

    // Initialize Schema
    await client.sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        avatar TEXT DEFAULT '',
        role VARCHAR(50) DEFAULT 'user',
        is_active BOOLEAN DEFAULT TRUE,
        login_attempts INTEGER DEFAULT 0,
        lock_until TIMESTAMP,
        theme VARCHAR(50) DEFAULT 'dark',
        language VARCHAR(10) DEFAULT 'en',
        agent_mode VARCHAR(50) DEFAULT 'EXPERT',
        bio VARCHAR(160) DEFAULT 'A superintelligent agent user.',
        location VARCHAR(50) DEFAULT 'Global',
        github VARCHAR(255) DEFAULT '',
        twitter VARCHAR(255) DEFAULT '',
        website VARCHAR(255) DEFAULT '',
        total_chats INTEGER DEFAULT 0,
        total_messages INTEGER DEFAULT 0,
        images_created INTEGER DEFAULT 0,
        files_analyzed INTEGER DEFAULT 0,
        quizzes_taken INTEGER DEFAULT 0,
        research_done INTEGER DEFAULT 0,
        reset_password_token VARCHAR(255),
        reset_password_expires TIMESTAMP,
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.sql`
      CREATE TABLE IF NOT EXISTS chats (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) DEFAULT 'New Chat',
        model VARCHAR(100) DEFAULT 'qwen/qwen3.5-397b-a22b',
        mode VARCHAR(50) DEFAULT 'EXPERT',
        is_archived BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.sql`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'text',
        file_url TEXT,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.sql`
      CREATE TABLE IF NOT EXISTS images (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        prompt TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'generated',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log('📊 SQL Tables Verified/Initialized');
  } catch (error) {
    console.error(`❌ Postgres Error: ${error.message}`);
    // Only exit in local dev, not serverless
    if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
       // process.exit(1);
    }
  }
};

module.exports = connectDB;
