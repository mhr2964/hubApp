// CLI helper — generate a bcrypt hash suitable for ADMIN_PASSWORD_HASH in .env.
//
// Usage:
//   node scripts/hash-password.js <password>
//
// Copy the printed line into .env as:
//   ADMIN_PASSWORD_HASH=<output>
const bcrypt = require('bcryptjs');

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-password.js <password>');
  process.exit(1);
}

console.log(bcrypt.hashSync(password, 10));
