// fetchBGGData.js

import axios from 'axios';
import xml2js from 'xml2js';
import { Client } from '@elastic/elasticsearch';

async function fetchBGGData() {
  try {
    // 1. Initialize Elasticsearch client (change node URL if needed)
    const esClient = new Client({
      node: 'https://localhost:9200',
      // If security is enabled, you may need:
      // auth: { username: 'elastic', password: 'YOUR_PASSWORD' },
      // ssl: { rejectUnauthorized: false } // for self-signed dev certs
      auth: {
        username: 'elastic',
        password: 'exJCBObGCRs61HBemmzu'
      },
      ssl: {
        // If you're using a self-signed cert in development
        // you can either supply the CA or disable strict validation:
        rejectUnauthorized: false
      }
    });

    // 2. Example: Fetch details for a single board game (e.g. ID = 13 for "Catan")
    const gameId = 13;
    const response = await axios.get(`https://boardgamegeek.com/xmlapi2/thing?id=${gameId}`);

    // 3. Parse XML to JSON
    const parser = new xml2js.Parser();
    const jsonData = await parser.parseStringPromise(response.data);

    // 4. Extract fields from the BGG XML structure
    const item = jsonData.items.item[0];
    const name = item.name ? item.name[0].$.value : 'Unknown';
    const minPlayers = item.minplayers ? item.minplayers[0].$.value : null;
    const maxPlayers = item.maxplayers ? item.maxplayers[0].$.value : null;
    const playingTime = item.playingtime ? item.playingtime[0].$.value : null;
    const description = item.description ? item.description[0] : '';

    // 5. Index into Elasticsearch
    await esClient.index({
      index: 'boardgames',
      id: gameId.toString(), // use BGG game ID as _id
      body: {
        name,
        minPlayers: Number(minPlayers),
        maxPlayers: Number(maxPlayers),
        playingTime: Number(playingTime),
        description
      }
    });

    // 6. Refresh to make the new doc immediately searchable
    await esClient.indices.refresh({ index: 'boardgames' });
    console.log(`Board game (ID: ${gameId}) indexed successfully!`);

  } catch (err) {
    console.error('Error fetching/indexing BGG data:', err);
  }
}

// Execute the function when the script runs
fetchBGGData();
