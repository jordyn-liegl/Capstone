"use client"; // Only if you're in Next.js 13 app router and want client-side code.

import { useState, FormEvent } from 'react';
import Head from 'next/head';
import styles from './Home.module.css';

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

  // 4. Type the event if you'd like (FormEvent<HTMLFormElement>)
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/recommendations?players=${players}`);
      // The response is presumably an array of Elasticsearch hits 
      // shaped like: [ { _source: BoardGameSource }, ... ]
      const data = await res.json();

      if (data && data.length > 0) {
        const randomGame = data[Math.floor(Math.random() * data.length)];
        // Here randomGame._source is of type BoardGameSource
        // So we store only that part in recommendation
        setRecommendation(randomGame._source);
      } else {
        setRecommendation(null);
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
