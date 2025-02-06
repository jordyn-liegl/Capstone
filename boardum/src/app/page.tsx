"use client"; // Only if you're in Next.js 13 app router and want client-side code.

import { useState, FormEvent } from 'react';
import Head from 'next/head';
import styles from './Home.module.css';
import { env } from 'process';

// 1. Define an interface that matches what randomGame._source contains.
interface BoardGameSource {
  name: string;
  minPlayers: number;
  maxPlayers: number;
  playingTime: number;
  description: string;
  // Add any other fields you have in _source
}

export default function Home() {
  // 2. "players" can stay as a string if you're just storing input from a field.
  const [players, setPlayers] = useState<string>('');
  // 3. recommendation is either null or a BoardGameSource
  const [recommendation, setRecommendation] = useState<BoardGameSource | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL ?? 'https://localhost:9200';

  // 4. Type the event if you'd like (FormEvent<HTMLFormElement>)
  // this lowkey doesn't work yet 
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
  
    try {
      const query = {
        query: {
          bool: {
            filter: [
              { range: { minPlayers: { lte: 4 } } },
              { range: { maxPlayers: { gte: 4 } } }
            ]
          }
        }
      };
  
      const res = await fetch(`${ELASTICSEARCH_URL}/boardgames/_search`, {
        method: 'POST', 
        body: JSON.stringify(query),
      });

      console.log(res);
  
      if (!res.ok) {
        throw new Error(`Error: ${res.status}`);
      }
  
      const data = await res.json();
  
      if (data && data.hits && data.hits.hits.length > 0) {
        const randomGame = data.hits.hits[Math.floor(Math.random() * data.hits.hits.length)];
        setRecommendation(randomGame._source);
      } else {
        setRecommendation(null);  // Handle case when no game is found
      }
    } catch (err) {
      console.error('Error fetching recommendation:', err);
      setRecommendation(null);
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
        <h1 className={styles.title}>
          Boardum
        </h1>

        <p className={styles.description}>
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

        {/* If we have a recommendation, display its fields */}
        {recommendation && (
          <div className={styles.resultCard}>
            <h2>{recommendation.name}</h2>
            <p>
              Players: {recommendation.minPlayers} - {recommendation.maxPlayers}
            </p>
            <p>Play Time: {recommendation.playingTime} minutes</p>
            <p className={styles.description}>{recommendation.description}</p>
          </div>
        )}
      </main>
    </div>
  );
}
