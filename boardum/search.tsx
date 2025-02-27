import { Client } from '@elastic/elasticsearch';

// Define the interface for the board game source
interface BoardGameSource {
    name: string;
    minPlayers: number;
    maxPlayers: number;
    playingTime: number;
    description: string;
  }

const esClient = new Client({
  node: 'http://localhost:9200', // Change if your ES instance runs elsewhere
  tls: {
    rejectUnauthorized: false, // If using self-signed certs
  },
});

async function runQuery() {
    try {
        const response = await esClient.search<BoardGameSource>({
            index: 'boardgames',
            query: {
                match: {
                    description: {
                        query: "manage finances",
                        fuzziness: "AUTO"
                    }
                }
            },
        });
    
        const results = response.hits.hits.map(hit => {
            // Check if _source exists
            if (hit._source) {
              return {
                name: hit._source.name,
                description: hit._source.description,
              };
            } else {
              return null; // Return null for undefined _source
            }
          }).filter((item): item is { name: string; description: string } => item !== null)
          .slice(0, 5); // Filter out null items
      
    
        // Print the results to the terminal
        console.log(JSON.stringify(results, null, 2));
    } catch (error) {
      console.error("Elasticsearch error:", error);
    }
  }

runQuery();
