"use client";

import { useState, FormEvent } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Home.module.css';

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
  const [step, setStep] = useState<number>(0);
  const [searchParams, setSearchParams] = useState<SearchParams>({
    players: '',
    maxPlayingTime: '',
    minAge: ''
  });

  const [recommendations, setRecommendations] = useState<BoardGameSource[]>([]);
  const [selectedGame, setSelectedGame] = useState<BoardGameSource | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [searched, setSearched] = useState<boolean>(false);

  const ELASTICSEARCH_URL = process.env.NEXT_PUBLIC_ELASTICSEARCH_URL ?? 'http://localhost:9200';

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
      alert('Please enter a valid number of players.');
      setLoading(false);
      return;
    }

    try {
      const query: any = {
        bool: {
          must: [
            { range: { minPlayers: { lte: numPlayers } } },
            { range: { maxPlayers: { gte: numPlayers } } }
          ]
        }
      };

      if (maxTime > 0) {
        query.bool.must.push({ range: { playingTime: { lte: maxTime } } });
      }

      if (minAge > 0) {
        query.bool.must.push({ range: { age: { lte: minAge } } });
      }

      const res = await fetch(`${ELASTICSEARCH_URL}/boardgames/_search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, size: 3 })
      });

      if (!res.ok) throw new Error(`Error: ${res.status}`);

      const data = await res.json();
      setSearched(true);
      setRecommendations(data?.hits?.hits.map((hit: any) => hit._source) || []);
    } catch (err) {
      console.error('Error fetching recommendation:', err);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);

  return (
    <div className={styles.container}>
      <Head>
        <title>Pick A Board Game</title>
        <meta name='description' content='Generate the best board game for you' />
      </Head>

      <main className={styles.main}>
        <center>
          <Image src='/boardum.png' alt='boardum' width={400} height={400} />
        </center>

        <AnimatePresence mode='wait'>
          {step === 0 && (
            <motion.div
              key='step1'
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.5 }}
            >
              <h2>Step 1: Enter Number of Players</h2>
              <input
                name='players'
                type='number'
                placeholder='e.g. 4'
                value={searchParams.players}
                onChange={handleInputChange}
              />
              <div className={styles.buttonGroup}>
                <button className={styles.navButton} onClick={handleNext}>→</button>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key='step2'
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.5 }}
            >
              <h2>Step 2: Enter Maximum Playing Time (minutes)</h2>
              <input
                name='maxPlayingTime'
                type='number'
                placeholder='e.g. 60'
                value={searchParams.maxPlayingTime}
                onChange={handleInputChange}
              />
              <div className={styles.buttonGroup}>
                <button className={styles.navButton} onClick={handleBack}>←</button>
                <button className={styles.navButton} onClick={handleNext}>→</button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key='step3'
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.5 }}
            >
              <h2>Step 3: Enter Minimum Age</h2>
              <input
                name='minAge'
                type='number'
                placeholder='e.g. 12'
                value={searchParams.minAge}
                onChange={handleInputChange}
              />
              <div className={styles.buttonGroup}>
                <button className={styles.navButton} onClick={handleBack}>←</button>
                <button className={styles.submitButton} onClick={handleSubmit}>{loading ? '⏳' : '✔'}</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {searched && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h2>Recommended Games</h2>
            <div className={styles.resultsGrid}>
              {recommendations.length > 0 ? (
                recommendations.map((game, index) => (
                  <motion.div
                    key={index}
                    className={styles.resultCard}
                    onClick={() => setSelectedGame(game)}
                    whileHover={{ scale: 1.1 }}
                  >
                    <h3>{game.name}</h3>
                    <p>Players: {game.minPlayers} - {game.maxPlayers}</p>
                    <p>Play Time: {game.playingTime} minutes</p>
                    <p>Minimum Age: {game.age}</p>
                  </motion.div>
                ))
              ) : (
                <p>No matching games found. Try different search parameters!</p>
              )}
            </div>
          </motion.div>
        )}

        {selectedGame && (
          <div className={styles.overlay} onClick={() => setSelectedGame(null)}>
            <motion.div
              className={styles.modal}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <h2>{selectedGame.name}</h2>
              <p dangerouslySetInnerHTML={{ __html: selectedGame.description.replace(/&#10;&#10;/g, '<br /><br />') }} />
              <button className={styles.closeButton} onClick={() => setSelectedGame(null)}>Close</button>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
