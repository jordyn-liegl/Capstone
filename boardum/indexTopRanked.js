import puppeteer from 'puppeteer';
import axios from 'axios';
import xml2js from 'xml2js';
import fs from 'fs-extra';
import dotenv from 'dotenv';

dotenv.config();

// Delay Function
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Login to BGG and Get Browser Instance
async function loginToBGG() {
  const browser = await puppeteer.launch({ headless: false }); // Use headless: false for debugging
  const page = await browser.newPage();

  // Go to login page
  await page.goto('https://boardgamegeek.com/login', { waitUntil: 'networkidle2' });

  // Fill in login form (adjust selectors if needed)
  await page.type('#inputUsername', process.env.BGG_USERNAME);
  await page.type('#inputPassword', process.env.BGG_PASSWORD);

  // Submit the form (Update selector if different)
  await Promise.all([
    page.click('button[type="submit"]'), // Use button instead of input
    page.waitForNavigation({ waitUntil: 'networkidle2' })
  ]);

  console.log('✅ Successfully logged into BGG!');
  return { browser, page };
}


// Scrape Game IDs from a Single Page
async function getTopRankedIDs(page, pageNumber) {
  const url = `https://boardgamegeek.com/browse/boardgame/page/${pageNumber}?sort=rank&sortdir=asc`;
  console.log(`Scraping board game IDs from: ${url}`);

  await page.goto(url, { waitUntil: 'networkidle2' });
  await delay(2000);

  const ids = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.collection_table .collection_objectname a.primary'))
      .map(el => el.getAttribute('href'))
      .filter(href => href && href.match(/\/boardgame\/(\d+)/))
      .map(href => href.match(/\/boardgame\/(\d+)/)[1]);
  });

  console.log(`Found ${ids.length} game IDs on page ${pageNumber}.`);
  return ids;
}

// Fetch Detailed Game Data from BGG API
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

    const categories = item.link
      ? item.link.filter(link => link.$.type === 'boardgamecategory').map(link => link.$.value)
      : [];

    const mechanics = item.link
      ? item.link.filter(link => link.$.type === 'boardgamemechanic').map(link => link.$.value)
      : [];

    return {
      id: gameId,
      name,
      minPlayers: Number(item.minplayers?.$.value || 0),
      maxPlayers: Number(item.maxplayers?.$.value || 0),
      playingTime: Number(item.playingtime?.$.value || 0),
      age: Number(item.minage?.$.value || 0),
      description: item.description || '',
      categories,
      mechanics,
      image: item.thumbnail || '',
    };
  } catch (error) {
    console.error(`Error fetching game ${gameId}:`, error.message);
    return null;
  }
}

// Save Game Data to JSON File
async function saveToJSON(games, pageNumber) {
  const dir = './data';
  await fs.ensureDir(dir);

  const outputFile = `${dir}/page_${pageNumber}.json`;
  await fs.writeJson(outputFile, games, { spaces: 2 });
  console.log(`💾 Saved ${games.length} games to ${outputFile}`);
}

// Main Function
(async function main() {
  try {
    const { browser, page } = await loginToBGG();

    const startPage = 120; // Continue from page 11
    const endPage = 120;  // Adjust as needed

    for (let p = startPage; p <= endPage; p++) {
      console.log(`\n--- Scraping Page ${p} ---`);
      const ids = await getTopRankedIDs(page, p);
      const allGameData = [];

      for (const gameId of ids) {
        const data = await fetchGameData(gameId);
        if (data) allGameData.push(data);

        // Wait 2 seconds before the next request to avoid getting blocked
        await delay(2000);
      }

      await saveToJSON(allGameData, p);
    }

    await browser.close();
    console.log('\n✅ Finished scraping all pages.');
  } catch (err) {
    console.error('\n❌ Unexpected error in main:', err.message);
  }
})();