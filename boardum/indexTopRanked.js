import axios from 'axios';
import { load } from 'cheerio';
import xml2js from 'xml2js';
import fs from 'fs';

// Define output file path
const OUTPUT_FILE = './data/seed.ndjson';

// Function to add a delay between requests
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to scrape game IDs from BoardGameGeek
async function getTopRankedIDs(page = 1) {
  const url = `https://boardgamegeek.com/browse/boardgame?sort=rank&sortdir=asc&page=${page}`;
  console.log(`Scraping board game IDs from: ${url}`);

  const res = await axios.get(url, { timeout: 10000 });
  const $ = load(res.data);

  const ids = [];
  $('.collection_table .collection_objectname a.primary').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      const match = href.match(/\/boardgame\/(\d+)/);
      if (match) {
        ids.push(match[1]);
      }
    }
  });

  console.log(`Found ${ids.length} game IDs on page ${page}.`);
  return ids;
}

// Function to fetch detailed game data
async function fetchGameData(gameId) {
  const parser = new xml2js.Parser({ explicitArray: false });

  try {
    const apiUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}`;
    console.log(`Fetching data for game ID: ${gameId}`);
    const res = await axios.get(apiUrl, { timeout: 10000 });
    const json = await parser.parseStringPromise(res.data);

    if (!json.items || !json.items.item) {
      console.warn(`Game ID ${gameId} not found.`);
      return null;
    }

    const item = json.items.item;
    let name = 'Unknown';

    if (Array.isArray(item.name)) {
      name = item.name[0]?.$?.value ?? 'Unknown';
    } else if (item.name && item.name.$) {
      name = item.name.$.value;
    }

    return {
      id: gameId,
      name,
      minPlayers: Number(item.minplayers?.$.value || 0),
      maxPlayers: Number(item.maxplayers?.$.value || 0),
      playingTime: Number(item.playingtime?.$.value || 0),
      description: item.description || ''
    };
  } catch (error) {
    console.error(`Error fetching game ${gameId}:`, error.message);
    return null;
  }
}

// Function to write game data to a JSON file
async function saveToJSON(games) {
  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(OUTPUT_FILE, { flags: 'w' });

    stream.on('error', reject);
    stream.on('finish', resolve);

    games.forEach(game => {
      if (game) {
        stream.write(JSON.stringify({ index: { _index: "boardgames", _id: game.id } }) + "\n");
        stream.write(JSON.stringify(game) + "\n");
      }
    });

    stream.end();
    console.log(`Saved ${games.length} games to ${OUTPUT_FILE}`);
  });
}

// Main function to scrape, fetch, and save data
(async function main() {
  try {
    const allIds = [];

    // Scrape the first 5 pages (~500 games)
    for (let p = 1; p <= 5; p++) {
      const ids = await getTopRankedIDs(p);
      allIds.push(...ids);
    }

    console.log(`Total unique game IDs found: ${new Set(allIds).size}`);

    const uniqueIds = [...new Set(allIds)];
    const allGameData = [];

    for (const gameId of uniqueIds) {
      const data = await fetchGameData(gameId);
      if (data) {
        allGameData.push(data);
      }

      // Wait 2 seconds before the next request
      console.log(`Waiting 2 seconds before the next request...`);
      await delay(2000);
    }

    await saveToJSON(allGameData);

    console.log('Finished scraping and saving top-ranked board games.');
  } catch (err) {
    console.error('Unexpected error in main:', err.message);
  }
})();
