pipeline {
    agent any
    options { skipDefaultCheckout(true) }

    environment {
        COMPOSE_PROJECT_NAME = 'cozyhouse-fe'
        FE_PORT = '3001'
        FE_CONTAINER_NAME = 'cozyhouse-frontend'
        NEXT_PUBLIC_API_URL = 'https://cozyapi.washqueue.com'
        INTERNAL_API_URL = 'http://cozyhouse-backend:3000'
    }

    stages {
        stage('Checkout') {
            steps {
                deleteDir()
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
                sh 'docker-compose build frontend'
            }
        }

        stage('Deploy') {
            steps {
                sh 'docker rm -f ${FE_CONTAINER_NAME} || true'
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
