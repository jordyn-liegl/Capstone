"use client";

import { useState, FormEvent } from 'react';
import Head from 'next/head';
import styles from './Home.module.css';
import Image from 'next/image';

interface BoardGameSource {
  name: string;
  minPlayers: number;
  maxPlayers: number;
  playingTime: number;
  age: number;
  description: string;
}

interface SearchParams {
  players: string;
  maxPlayingTime: string;
  minAge: string;
}

export default function Home() {
  const [searchParams, setSearchParams] = useState<SearchParams>({
    players: '',
    maxPlayingTime: '',
    minAge: ''
  });

  const [recommendations, setRecommendations] = useState<BoardGameSource[]>([]);
  const [selectedGame, setSelectedGame] = useState<BoardGameSource | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [searched, setSearched] = useState<boolean>(false);

  const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSearched(false);

    const numPlayers = Number(searchParams.players);
    const maxTime = Number(searchParams.maxPlayingTime);
    const minAge = Number(searchParams.minAge);

    if (isNaN(numPlayers) || numPlayers <= 0) {
      alert("Please enter a valid number of players.");
      setLoading(false);
      return;
    }

    try {
      const query: any = {
        bool: {
          must: [
            { range: { minPlayers: { lte: numPlayers } } },
            { range: { maxPlayers: { gte: numPlayers } } },
          ]
        }
      };

      // Add playing time filter if provided
      if (maxTime > 0) {
        query.bool.must.push({
          range: { playingTime: { lte: maxTime } }
        });
      }

      // Add age filter if provided
      if (minAge > 0) {
        query.bool.must.push({
          range: { age: { lte: minAge } }
        });
      }

      const res = await fetch(`${ELASTICSEARCH_URL}/boardgames/_search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          size: 100,
        }),
      });

      if (!res.ok) {
        throw new Error(`Error: ${res.status}`);
      }

      const data = await res.json();
      setSearched(true);

      if (data?.hits?.hits.length > 0) {
        const games = data.hits.hits.map((hit: any) => hit._source);
        setRecommendations(games);
      } else {
        setRecommendations([]);
      }
    } catch (err) {
      console.error('Error fetching recommendation:', err);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Pick A Board Game</title>
        <meta name="description" content="Generate the best board game for you" />
      </Head>

      <main className={styles.main}>
        <center>
          <Image src="/boardum.png" alt="boardum" width={500} height={500} />
        </center>

        <p className={styles.description2}>
          Feeling indecisive? Let us recommend a board game for you!
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="players">Number of Players</label>
            <input
              id="players"
              name="players"
              type="number"
              placeholder="e.g. 4"
              value={searchParams.players}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="maxPlayingTime">Maximum Playing Time (minutes)</label>
            <input
              id="maxPlayingTime"
              name="maxPlayingTime"
              type="number"
              placeholder="e.g. 60"
              value={searchParams.maxPlayingTime}
              onChange={handleInputChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="minAge">Minimum Age</label>
            <input
              id="minAge"
              name="minAge"
              type="number"
              placeholder="e.g. 12"
              value={searchParams.minAge}
              onChange={handleInputChange}
            />
          </div>

          <button type="submit" className={styles.btn}>
            {loading ? 'Picking...' : 'Pick a Game'}
          </button>
        </form>

        {recommendations.length > 0 ? (
          <div className={styles.resultsGrid}>
            {recommendations.map((game, index) => (
              <div 
                key={index} 
                className={styles.resultCard} 
                onClick={() => setSelectedGame(game)}
              >
                <h2>{game.name}</h2>
                <p>Players: {game.minPlayers} - {game.maxPlayers}</p>
                <p>Play Time: {game.playingTime} minutes</p>
                <p>Minimum Age: {game.age}</p>
              </div>
            ))}
          </div>
        ) : (
          searched && !loading && (
            <div>
              <h2>No matching games found.</h2> 
              <p>Try different search parameters!</p>
            </div>
          )
        )}

        {selectedGame && (
          <>
            <div className={styles.overlay} onClick={() => setSelectedGame(null)}></div>
            <div className={styles.modal}>
              <h2>{selectedGame.name}</h2>
              <p 
                dangerouslySetInnerHTML={{ 
                  __html: selectedGame.description.replace(/&#10;&#10;/g, '<br /><br />') 
                }}
              />
              <button className={styles.closeButton} onClick={() => setSelectedGame(null)}>x</button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}