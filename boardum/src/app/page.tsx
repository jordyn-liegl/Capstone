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
  age: number;
  description: string;
  // Add any other fields you have in _source
}

export default function Home() {
  // 2. "players" can stay as a string if you're just storing input from a field.
  const [players, setPlayers] = useState<string>('');
  // 3. recommendation is either null or a BoardGameSource
  const [recommendation, setRecommendation] = useState<BoardGameSource | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200';

  // 4. Type the event if you'd like (FormEvent<HTMLFormElement>)

  const [searched, setSearched] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSearched(false); // Reset before search

    // Convert players input to a number
    const numPlayers = Number(players);
    if (isNaN(numPlayers) || numPlayers <= 0) {
      alert("Please enter a valid number of players.");
      setLoading(false);
      return;
    }
  
    try {
      const res = await fetch(`${ELASTICSEARCH_URL}/boardgames/_search`, {
        method: 'POST',  // Change to POST because we are sending a query
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: {
            bool: {
              must: [
                { range: { minPlayers: { lte: numPlayers } } }, // minPlayers ≤ numPlayers
                { range: { maxPlayers: { gte: numPlayers } } }, // maxPlayers ≥ numPlayers
              ],
            },
          },
          size: 10, // Get up to 10 matching results
        }),
      });
  
      if (!res.ok) {
        throw new Error(`Error: ${res.status}`);
      }
  
      const data = await res.json();
      setSearched(true); // Mark that a search was attempted

      if (data?.hits?.hits.length > 0) {
        const randomGame = data.hits.hits[Math.floor(Math.random() * data.hits.hits.length)];
        setRecommendation(randomGame._source);
      } else {
        setRecommendation(null);  // No matching games
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

        {/* If we have a recommendation, display it; otherwise, show a message */}
        {recommendation ? (
          <div className={styles.resultCard}>
            <h2>{recommendation.name}</h2>
            <p>Players: {recommendation.minPlayers} - {recommendation.maxPlayers}</p>
            <p>Play Time: {recommendation.playingTime} minutes</p>
            <p>Minimum Age: {recommendation.age} </p>
            <p className={styles.description}>{recommendation.description}</p>
          </div>
        ) : (
          searched && !loading && (
            <div>
              <h2>No matching games found.</h2> 
              <p>Try a different number of players!</p>
            </div>
          )
        )}
      </main>
    </div>
  );
}
