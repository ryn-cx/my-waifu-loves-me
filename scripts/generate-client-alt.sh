#! /usr/bin/env bash

set -e
set -x

cd backend

curl -o ../openapi.json http://localhost:8100/api/v1/openapi.json
cd ..
mv openapi.json frontend/
cd frontend
npm run generate-client
npx biome format --write ./src/client
