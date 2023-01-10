import Redis from 'ioredis';
import config from './config.js';
import { WSSharedDoc } from './setupWSConnection.js';

const redis = new Redis(config.redis);

export default redis;

export const getDocUpdatesKey = (doc: WSSharedDoc) => `doc:${doc.name}:updates`;

export const getDocUpdatesFromQueue = async (doc: WSSharedDoc) => {
  return await redis.lrangeBuffer(getDocUpdatesKey(doc), 0, -1);
}

//Push the events to Redis.
export const pushDocUpdatesToQueue = async (doc: WSSharedDoc, update: Uint8Array) => {
  const len = await redis.llen(getDocUpdatesKey(doc));

  //If the buffer is full, pop the old data and push the new data.
  if (len > 100) {
    await redis.pipeline()
        .lpopBuffer(getDocUpdatesKey(doc))
        .rpushBuffer(getDocUpdatesKey(doc), Buffer.from(update))
        .expire(getDocUpdatesKey(doc), 300)
        .exec()
  } else {
    //If the buffer still has space, push the data.
    await redis.pipeline()
      .rpushBuffer(getDocUpdatesKey(doc), Buffer.from(update))
      .expire(getDocUpdatesKey(doc), 300)
      .exec();
  }
}