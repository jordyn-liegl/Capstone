import axios from 'axios';
import xml2js from 'xml2js';
import { Client } from '@elastic/elasticsearch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchBGGData() {
  try {
    // 1. Initialize Elasticsearch client
    const esClient = new Client({
      node: 'http://localhost:9200',
      auth: {
        username: 'elastic',
        password: 'exJCBObGCRs61HBemmzu'
      },
      ssl: {
        rejectUnauthorized: false
      }
    });

    // 2. Fetch data for a board game (e.g., ID = 13 for "Catan")
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

    const gameData = {
      id: gameId.toString(),
      name,
      minPlayers: Number(minPlayers),
      maxPlayers: Number(maxPlayers),
      playingTime: Number(playingTime),
      description
    };

    // 5. Index into Elasticsearch
    await esClient.index({
      index: 'boardgames',
      id: gameData.id,
      body: gameData
    });

    // 6. Refresh the index
    await esClient.indices.refresh({ index: 'boardgames' });
    console.log(`Board game (ID: ${gameId}) indexed successfully!`);

    // 7. Save to the data/ folder
    const dataFolderPath = path.resolve(__dirname, 'data');
    if (!fs.existsSync(dataFolderPath)) {
      fs.mkdirSync(dataFolderPath); // Create the folder if it doesn't exist
    }

    const filePath = path.join(dataFolderPath, `${gameId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(gameData, null, 2), 'utf-8');
    console.log(`Board game data saved to ${filePath}`);

  } catch (err) {
    console.error('Error fetching/indexing BGG data:', err);
  }
}

fetchBGGData();
