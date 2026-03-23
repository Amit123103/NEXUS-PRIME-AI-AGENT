const { sql } = require('@vercel/postgres');

const Chat = {
  // Find all chats for a user
  find: async (query) => {
    const { rows } = await sql`
      SELECT * FROM chats 
      WHERE user_id = ${query.userId} 
      AND is_archived = ${query.isArchived || false}
      ORDER BY updated_at DESC;
    `;
    return rows;
  },

  // Find chat by ID with messages
  findById: async (id) => {
    const chatResult = await sql`SELECT * FROM chats WHERE id = ${id} LIMIT 1;`;
    if (chatResult.rows.length === 0) return null;
    
    const chat = chatResult.rows[0];
    const messageResult = await sql`
      SELECT * FROM messages 
      WHERE chat_id = ${id} 
      ORDER BY created_at ASC;
    `;
    
    return { ...chat, messages: messageResult.rows };
  },

  // Create new chat
  create: async ({ userId, title, model, mode }) => {
    const { rows } = await sql`
      INSERT INTO chats (user_id, title, model, mode)
      VALUES (${userId}, ${title}, ${model}, ${mode})
      RETURNING *;
    `;
    return rows[0];
  },

  // Delete chat
  findByIdAndDelete: async (id) => {
    await sql`DELETE FROM chats WHERE id = ${id};`;
    return { id };
  }
};

const Message = {
  // Create message
  create: async ({ chatId, role, content, type, fileUrl, imageUrl }) => {
    const { rows } = await sql`
      INSERT INTO messages (chat_id, role, content, type, file_url, image_url)
      VALUES (${chatId}, ${role}, ${content}, ${type}, ${fileUrl}, ${imageUrl})
      RETURNING *;
    `;
    // Update chat timestamp
    await sql`UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ${chatId};`;
    return rows[0];
  }
};

module.exports = { Chat, Message };
