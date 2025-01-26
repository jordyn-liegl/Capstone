// recommendations.js
import express from 'express';
import { Client } from '@elastic/elasticsearch';

const router = express.Router();
const esClient = new Client({
  node: 'https://localhost:9200',
  auth: {
    username: 'elastic',
    password: 'YOUR_PASSWORD'
  },
  ssl: { rejectUnauthorized: false }
});

// Example: Filter boardgames by min/max players
router.get('/', async (req, res) => {
  const { players = 4 } = req.query; // default to 4 players
  try {
    const { body } = await esClient.search({
      index: 'boardgames',
      body: {
        query: {
          bool: {
            must: [
              { range: { minPlayers: { lte: players } } },
              { range: { maxPlayers: { gte: players } } }
            ]
          }
        }
      }
    });
    res.json(body.hits.hits);
  } catch (error) {
    console.error('Elasticsearch error:', error);
    res.status(500).json({ error: 'Error fetching recommendations' });
  }
});

export default router;
