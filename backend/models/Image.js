const { sql } = require('@vercel/postgres');

const Image = {
  // Find images for user
  find: async (query) => {
    const { rows } = await sql`
      SELECT * FROM images 
      WHERE user_id = ${query.user} 
      ORDER BY created_at DESC;
    `;
    return rows;
  },

  // Create image record
  create: async ({ user, url, prompt, type }) => {
    const { rows } = await sql`
      INSERT INTO images (user_id, url, prompt, type)
      VALUES (${user}, ${url}, ${prompt}, ${type})
      RETURNING *;
    `;
    return rows[0];
  }
};

module.exports = Image;
