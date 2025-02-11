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

export default function Home() {
  const [players, setPlayers] = useState<string>('');
  const [recommendations, setRecommendations] = useState<BoardGameSource[]>([]);
  const [selectedGame, setSelectedGame] = useState<BoardGameSource | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [searched, setSearched] = useState<boolean>(false);

  const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSearched(false);

    const numPlayers = Number(players);
    if (isNaN(numPlayers) || numPlayers <= 0) {
      alert("Please enter a valid number of players.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${ELASTICSEARCH_URL}/boardgames/_search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: {
            bool: {
              must: [
                { range: { minPlayers: { lte: numPlayers } } },
                { range: { maxPlayers: { gte: numPlayers } } },
              ],
            },
          },
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
        <Image src="/boardum.png" alt="boardum" width={500} height={500} /></center>

        <p className={styles.description2}>
          Feeling indecisive? Let us recommend a board game for you!
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label htmlFor="players">Number of Players</label>
          <input
            id="players"
            type="number"
            placeholder="e.g. 4"
            value={players}
            onChange={(e) => setPlayers(e.target.value)}
            required
          />
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
              <p>Try a different number of players!</p>
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
