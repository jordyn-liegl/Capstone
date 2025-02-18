import axios from 'axios';
import { load } from 'cheerio';
import xml2js from 'xml2js';
import fs from 'fs';

// Function to add a delay between requests
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to scrape game IDs from BoardGameGeek
async function getTopRankedIDs(page) {
  const url = `https://boardgamegeek.com/browse/boardgame/page/${page}?sort=rank&sortdir=asc`;
  console.log(`Scraping board game IDs from: ${url}`);
  console.log(`Requesting page: ${page}`);


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
      age: Number(item.minage?.$.value || 0),
      description: item.description || ''
    };
  } catch (error) {
    console.error(`Error fetching game ${gameId}:`, error.message);
    return null;
  }
}

// Function to write game data to a JSON file
async function saveToJSON(games, page) {
  const outputFile = `./data/page_${page}.json`;
  fs.writeFileSync(outputFile, JSON.stringify(games, null, 2));
  console.log(`Saved ${games.length} games to ${outputFile}`);
}

// Main function to scrape, fetch, and save data
(async function main() {
  try {
    // Modify p values to decide which page(s) to scrape
    for (let p = 1; p <= 2; p++) {
      const ids = await getTopRankedIDs(p);
      const allGameData = [];

      for (const gameId of ids) {
        const data = await fetchGameData(gameId);
        if (data) {
          allGameData.push(data);
        }
        
        // Wait 2 seconds before the next request
        console.log(`Waiting 2 seconds before the next request...`);
        await delay(2000);
      }
      
      await saveToJSON(allGameData, p);
    }

    console.log('Finished scraping and saving top-ranked board games.');
  } catch (err) {
    console.error('Unexpected error in main:', err.message);
  }
})();
