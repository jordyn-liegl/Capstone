// indexTopRanked.js
import axios from 'axios';
import { load } from 'cheerio';  // <-- Use named import instead of 'import cheerio from "cheerio"'
import xml2js from 'xml2js';
import { Client } from '@elastic/elasticsearch';


// Elasticsearch client config
const esClient = new Client({
  node: 'http://localhost:9200', // or your ES endpoint
  auth: {
    username: 'elastic',
    password: 'exJCBObGCRs61HBemmzu'
  },
  ssl: { rejectUnauthorized: false } // for self-signed certs in dev
});


/**
 * Scrapes "browse/boardgame" pages on BGG to get top-ranked boardgame IDs.
 * Each page typically lists ~100 games.
 * e.g. page=1 => top 1-100, page=2 => top 101-200, etc.
 */
async function getTopRankedIDs(page = 1) {
  const url = `https://boardgamegeek.com/browse/boardgame?sort=rank&sortdir=asc&page=${page}`;
  console.log(`Scraping board game IDs from: ${url}`);


  const res = await axios.get(url, { timeout: 10000 });


  // Instead of "cheerio.load(...)", we do:
  const $ = load(res.data);


  const ids = [];
  // Query the row that holds each game link: .collection_table .collection_objectname a.primary
  $('.collection_table .collection_objectname a.primary').each((_, el) => {
    const href = $(el).attr('href'); // e.g. "/boardgame/13/catan"
    if (href) {
      // Extract the numeric portion
      const match = href.match(/\/boardgame\/(\d+)/);
      if (match) {
        ids.push(match[1]);
      }
    }
  });


  console.log(`Found ${ids.length} game IDs on page ${page}.`);
  return ids;
}


/**
 * Fetches detailed board game info from the BGG XML API for a given game ID.
 * Parses the XML to JSON, extracts fields, returns a structured object.
 */
async function fetchGameData(gameId) {
  const parser = new xml2js.Parser({ explicitArray: false });
  try {
    const apiUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}`;
    const res = await axios.get(apiUrl, { timeout: 10000 });
    const json = await parser.parseStringPromise(res.data);


    // If the item doesn't exist or is invalid
    if (!json.items || !json.items.item) {
      return null;
    }


    const item = json.items.item;
    let name = 'Unknown';


    // "name" can be an array if BGG returns multiple name entries
    if (Array.isArray(item.name)) {
      name = item.name[0]?.$?.value ?? 'Unknown';
    } else if (item.name && item.name.$) {
      name = item.name.$.value;
    }


    const minPlayers = Number(item.minplayers?.$.value || 0);
    const maxPlayers = Number(item.maxplayers?.$.value || 0);
    const playingTime = Number(item.playingtime?.$.value || 0);
    const description = item.description || '';


    return {
      id: gameId,
      name,
      minPlayers,
      maxPlayers,
      playingTime,
      description
    };
  } catch (error) {
    console.error(`Error fetching game ${gameId}:`, error.message);
    return null;
  }
}


/**
 * Indexes a single game’s data into Elasticsearch.
 */
async function indexGame(gameData) {
  if (!gameData) return;
  try {
    await esClient.index({
      index: 'boardgames',
      id: gameData.id,  // use BGG ID as the _id
      body: gameData
    });
    console.log(`Indexed game ID ${gameData.id} - ${gameData.name}`);
  } catch (error) {
    console.error(`Error indexing game ID ${gameData.id}:`, error.message);
  }
}


/**
 * Main function to scrape top-ranked game IDs, fetch details, and index them.
 */
(async function main() {
  try {
    // For demonstration: get the top 200 games (pages 1 & 2)
    // Each page has ~100 games in rank order
    const allIds = [];
    for (let p = 1; p <= 2; p++) {
      const ids = await getTopRankedIDs(p);
      allIds.push(...ids);
    }


    console.log(`Total game IDs found: ${allIds.length}`);


    // Remove duplicates in case there's overlap between pages
    const uniqueIds = [...new Set(allIds)];


    // Fetch each game’s XML data and index it
    for (const gameId of uniqueIds) {
      const data = await fetchGameData(gameId);
      if (data) {
        await indexGame(data);
      }
      // Delay to avoid hammering BGG (2 seconds)
      await new Promise(res => setTimeout(res, 2000));
    }


    console.log('Finished indexing top-ranked board games.');
  } catch (err) {
    console.error('Unexpected error in main:', err.message);
  }
})();
