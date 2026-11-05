const mongoose = require('mongoose');

/**
 * Cached MongoDB connection for serverless environments.
 * Reuses the same connection promise across warm invocations so we
 * don't open a new socket on every request.
 */
let cached = global.__mongooseConnection;

if (!cached) {
  cached = global.__mongooseConnection = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    cached.promise = mongoose
      .connect(uri, {
        dbName: 'aus-ncc',
        bufferCommands: false,
      })
      .then((m) => {
        console.log('MongoDB connected successfully');
        return m.connection;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = { connectDB };
