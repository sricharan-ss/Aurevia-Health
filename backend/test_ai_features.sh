#!/bin/bash

# Port
PORT=3001
PATIENT_ID="pat_001" # Evelyn Harper (on Warfarin)

echo "--- 1. Starting Consultation ---"
curl -X POST http://localhost:$PORT/api/consultation/start \
  -H "Content-Type: application/json" \
  -d "{\"patientId\": \"$PATIENT_ID\"}"
echo -e "\n"

echo "--- 2. Patient mentions Warfarin ---"
curl -X POST http://localhost:$PORT/api/consultation/process \
  -H "Content-Type: application/json" \
  -d "{\"patientId\": \"$PATIENT_ID\", \"speaker\": \"patient\", \"text\": \"I have been taking my Warfarin daily as prescribed.\"}"
echo -e "\n"

echo "--- 3. Doctor prescribes Aspirin (Should trigger Alert) ---"
curl -X POST http://localhost:$PORT/api/consultation/process \
  -H "Content-Type: application/json" \
  -d "{\"patientId\": \"$PATIENT_ID\", \"speaker\": \"doctor\", \"text\": \"I think we should add Aspirin for your headaches.\"}"
echo -e "\n"

echo "--- 4. Checking Suggested Questions (Chest Pain) ---"
curl -X POST http://localhost:$PORT/api/consultation/process \
  -H "Content-Type: application/json" \
  -d "{\"patientId\": \"$PATIENT_ID\", \"speaker\": \"patient\", \"text\": \"I've also had some chest pain recently.\"}"
echo -e "\n"
