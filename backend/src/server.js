require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🔐 LexCrypt Backend running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV}`);
    console.log(`🗄️  MongoDB: connected\n`);
  });
});
