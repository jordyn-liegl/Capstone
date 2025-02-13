// app/api/recommendations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@elastic/elasticsearch';


const esClient = new Client({
  node: 'http://elasticsearch:9200',
  tls: {
    rejectUnauthorized: false, // If using self-signed certs in development
  },
});


interface BoardGameSource {
  name: string;
  minPlayers: number;
  maxPlayers: number;
  playingTime: number;
  description: string;
  // Add any other fields you have in _source
}


export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const playersParam = url.searchParams.get('players');
    const players = playersParam ? parseInt(playersParam, 10) : 4;


    const response = await esClient.search<BoardGameSource>({
      index: 'boardgames',
      query: {
        bool: {
          must: [
            { range: { minPlayers: { lte: players } } },
            { range: { maxPlayers: { gte: players } } },
          ],
        },
      },
    });


    return NextResponse.json(response.hits.hits);
  } catch (error) {
    console.error('Elasticsearch error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
