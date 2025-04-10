# Welcome to our Capstone Project
Welcome to the Game Genies Capstone Project Repository! This guide will help you get started with setting up and running our project, Boardum!

## Prerequisites
Before you begin, ensure you have the following installed on your system:
- **Docker**
- **Elasticsearch**

## Getting Started
Follow these steps to run the project:

### 1. Clone the Repository
First, clone this repository to your local machine:
- git clone https://github.com/jordyn-liegl/Capstone.git
- cd Capstone/boardum

### 2. Start the Services
If this is your first time building the project:
- npm install
- docker-compose up --build
  
This will:
* Build the Docker containers
* Start the backend and frontend services
* Connect to Elasticsearch

If this is not your first time running the project:
- docker-compose up

### 3. Access the Application
Once the services are running, open your web browser and navigate to:
- localhost:3000
  
You should see the application up and running!

## Troubleshooting
If you encounter any issues:
1. Ensure Docker and Elasticsearch are running
2. Rebuild
   - docker-compose down -v
   - npm install
   - docker-compose up --build
3. Reach out to the team for support
