import { createClient } from 'redis';
import { config } from '../../config'; 

class RedisClient {
  private client: ReturnType<typeof createClient>;
  private static instance: RedisClient;

  private constructor() {
    this.client = createClient({
      url: config.redis.url,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 5) {
            console.error('❌ Too many Redis connection attempts. Giving up.');
            return new Error('Connection failed');
          }
          console.log(`🔁 Redis reconnecting (attempt ${retries + 1})`);
          return Math.min(retries * 100, 5000);
        },
      },
    });

    // Event handlers
    this.client.on('error', (err) => console.error('Redis Client Error:', err));
    this.client.on('connect', () => console.log('✅ Redis connection established'));
    this.client.on('ready', () => console.log('🚀 Redis client ready'));
    this.client.on('reconnecting', () => console.log('🔁 Redis reconnecting...'));
    this.client.on('end', () => console.log('🔌 Redis connection ended'));
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  public async connect(): Promise<void> {
    try {
      if (!this.client.isOpen) {
        console.log('⚡ Connecting to Redis...');
        await this.client.connect();
      }
    } catch (err) {
      console.error('💥 Failed to connect to Redis:', err);
      throw err;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.client.isOpen) {
        await this.client.disconnect();
      }
    } catch (err) {
      console.error('💥 Failed to disconnect from Redis:', err);
    }
  }

  public getClient(): ReturnType<typeof createClient> {
    return this.client;
  }
}

// Initialize and export
const redisInstance = RedisClient.getInstance();
export const redisClient = redisInstance.getClient();

// Auto-connect when imported
(async () => {
  try {
    await redisInstance.connect();
  } catch (err) {
    console.error('Initial Redis connection failed:', err);
    process.exit(1); // Exit if initial connection fails
  }
})();