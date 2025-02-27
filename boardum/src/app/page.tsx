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
  categories: string[];
  mechanics: string[];
}

const categoriesList = ['Card Game', 'Fantasy', 'Economic', 'Fighting', 'Science Fiction', 'Exploration', 'Adventure', 'Miniatures', 'City Building', 'Wargame'];
const mechanicsList = ['Hand Management', 'Variable Player Powers', 'Dice Rolling', 'Solo / Solitaire Game', 'Open Drafting', 'Set Collection', 'Area Majority / Influence', 'Modular Board', 'Cooperative Game', 'Tile Placement'];

export default function Home() {
  const [step, setStep] = useState<number>(0);
  const [searchParams, setSearchParams] = useState<SearchParams>({
    players: '',
    maxPlayingTime: '',
    minAge: '',
    categories: [],
    mechanics: []
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

  const toggleSelection = (type: 'categories' | 'mechanics', value: string) => {
    setSearchParams(prev => ({
      ...prev,
      [type]: prev[type].includes(value)
        ? prev[type].filter(item => item !== value)
        : [...prev[type], value]
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSearched(false);

    const numPlayers = Number(searchParams.players);
    const maxTime = Number(searchParams.maxPlayingTime);
    const minAge = Number(searchParams.minAge);

    if (numPlayers <= 0) {
        alert('Please enter a valid number of players.');
        setLoading(false);
        return;
    }

    const mustConditions = [
        { range: { minPlayers: { lte: numPlayers } } },
        { range: { maxPlayers: { gte: numPlayers } } },
        ...(maxTime > 0 ? [{ range: { playingTime: { lte: maxTime } } }] : []),
        ...(minAge > 0 ? [{ range: { age: { lte: minAge } } }] : [])
    ];

    const shouldConditions = [
        ...(searchParams.categories?.length ? [{ terms: { category: searchParams.categories } }] : []),
        ...(searchParams.mechanics?.length ? [{ terms: { mechanics: searchParams.mechanics } }] : []),
        ...(searchParams.categories?.length || searchParams.mechanics?.length ? [{ match: { description: searchParams.categories.concat(searchParams.mechanics).join(' ') } }] : [])
    ];

    const query = {
      bool: {
        must: mustConditions,
        should: [
          ...shouldConditions,
          {
            match: {
              description: {
                query: "",
                fuzziness: "AUTO"
              }
            }
          }
        ],
        minimum_should_match: shouldConditions.length ? 1 : 0
      }
    };
    

    try {
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
        <meta name="description" content="Generate the best board game for you" />
      </Head>

      <main className={styles.main}>
        <center>
          <Image src="/boardum.png" alt="boardum" width={400} height={400} />
        </center>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.5 }}
            >
              <h2>Step 1: Enter Number of Players</h2>
              <input
                name="players"
                type="number"
                placeholder="e.g. 4"
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
              key="step2"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.5 }}
            >
              <h2>Step 2: Enter Maximum Playing Time (minutes)</h2>
              <input
                name="maxPlayingTime"
                type="number"
                placeholder="e.g. 60"
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
              key="step3"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.5 }}
            >
              <h2>Step 3: Enter Minimum Age</h2>
              <input
                name="minAge"
                type="number"
                placeholder="e.g. 12"
                value={searchParams.minAge}
                onChange={handleInputChange}
              />
              <div className={styles.buttonGroup}>
                <button className={styles.navButton} onClick={handleBack}>←</button>
                <button className={styles.navButton} onClick={handleNext}>→</button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.5 }}
            >
              <h2>Step 4: Select Categories</h2>
              <div className={styles.buttonGroup}>
                {categoriesList.map((category) => (
                  <button
                    key={category}
                    className={`${styles.optionButton} ${searchParams.categories.includes(category) ? styles.selected : ''}`}
                    onClick={() => toggleSelection('categories', category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <div className={styles.buttonGroup}>
                <button className={styles.navButton} onClick={handleBack}>←</button>
                <button className={styles.navButton} onClick={handleNext}>→</button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.5 }}
            >
              <h2>Step 5: Select Mechanics</h2>
              <div className={styles.buttonGroup}>
                {mechanicsList.map((mechanic) => (
                  <button
                    key={mechanic}
                    className={`${styles.optionButton} ${searchParams.mechanics.includes(mechanic) ? styles.selected : ''}`}
                    onClick={() => toggleSelection('mechanics', mechanic)}
                  >
                    {mechanic}
                  </button>
                ))}
              </div>
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

