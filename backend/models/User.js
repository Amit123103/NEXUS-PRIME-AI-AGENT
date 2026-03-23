const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');

const User = {
  // Create a new user
  create: async ({ fullName, username, email, password }) => {
    const hashedPassword = await bcrypt.hash(password, 12);
    const { rows } = await sql`
      INSERT INTO users (full_name, username, email, password)
      VALUES (${fullName}, ${username}, ${email}, ${hashedPassword})
      RETURNING *;
    `;
    return rows[0];
  },

  // Find user by email
  findOne: async (query) => {
    let rows = [];
    if (query.email) {
      ({ rows } = await sql`SELECT * FROM users WHERE email = ${query.email.toLowerCase()} LIMIT 1;`);
    } else if (query.username) {
      ({ rows } = await sql`SELECT * FROM users WHERE username = ${query.username.toLowerCase()} LIMIT 1;`);
    } else if (query._id || query.id) {
       const id = query._id || query.id;
      ({ rows } = await sql`SELECT * FROM users WHERE id = ${id} LIMIT 1;`);
    }
    return rows[0] || null;
  },

  // Find user by ID (Mongoose compatibility helper)
  findById: async (id) => {
    const { rows } = await sql`SELECT * FROM users WHERE id = ${id} LIMIT 1;`;
    return rows[0] || null;
  },

  // Update user
  findByIdAndUpdate: async (id, update) => {
    // Basic implementation for compatibility
    if (update.$set) update = update.$set;
    
    // For specific fields like reset tokens
    if (update.resetPasswordToken) {
       await sql`
        UPDATE users 
        SET reset_password_token = ${update.resetPasswordToken}, 
            reset_password_expires = ${update.resetPasswordExpires}
        WHERE id = ${id};
      `;
    }
    
    const { rows } = await sql`SELECT * FROM users WHERE id = ${id} LIMIT 1;`;
    return rows[0];
  },

  // Instance-like methods for compatibility
  comparePassword: async (candidatePassword, hashedPassword) => {
    return await bcrypt.compare(candidatePassword, hashedPassword);
  }
};

module.exports = User;
