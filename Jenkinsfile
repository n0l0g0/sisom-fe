pipeline {
    agent any

    environment {
        COMPOSE_PROJECT_NAME = 'cozyhouse-fe'
        
        // Frontend Config
        FE_PORT = '3001'
        FE_CONTAINER_NAME = 'cozyhouse-frontend'
        NEXT_PUBLIC_API_URL = 'https://cozyapi.washqueue.com'
        INTERNAL_API_URL = 'http://cozyhouse-backend:3000'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Prepare Configs') {
            steps {
                script {
                    writeFile file: 'docker-compose.yml', text: """
version: "2.2"
services:
  frontend:
    build:
      context: .
      args:
        NEXT_PUBLIC_API_URL: "${NEXT_PUBLIC_API_URL}"
        INTERNAL_API_URL: "${INTERNAL_API_URL}"
    container_name: ${FE_CONTAINER_NAME}
    ports:
      - "${FE_PORT}:3000"
    environment:
      - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
      - INTERNAL_API_URL=${INTERNAL_API_URL}
    restart: unless-stopped
    networks:
      - sisomapt-be_default

networks:
  sisomapt-be_default:
    external: true
"""
                }
            }
        }
        
        stage('Build') {
            steps {
                // BuildKit is missing/broken on this environment, falling back to legacy builder
                sh 'COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=0 docker-compose build frontend'
            }
        }

        stage('Deploy') {
            steps {
                sh 'docker-compose up -d --remove-orphans frontend'
            }
        }
        
        stage('Cleanup') {
            steps {
                sh 'docker image prune -f'
            }
        }
    }
}
