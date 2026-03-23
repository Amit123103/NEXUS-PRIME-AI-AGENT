# ⚡ NEXUS PRIME OMEGA — Superintelligent AI Gateway

Nexus Prime Omega is a high-performance, **100% stateless AI gateway** powered by the global NVIDIA AI network. It provides a unified, multimodal interface for chat, image generation, video synthesis, deep research, speech-to-text, and biological computation.

![Vibrant UI](https://img.shields.io/badge/UI-Vibrant_Glassmorphism-FF007F)
![Backend](https://img.shields.io/badge/Backend-Stateless_Node.js-00E5FF)
![AI](https://img.shields.io/badge/AI-NVIDIA_NIM-7c3aed)

## 🚀 Key Features

- **🌐 Universal AI Gateway**: A single portal for the world's most powerful neural engines.
- **🧠 Multi-Model Intelligence**: Dynamically switches models based on task:
  - **Expert Mode**: Meta Llama-3-70B
  - **Creative Mode**: NVIDIA Nemotron-4-340B
  - **Technical Mode**: Microsoft Phi-3-Mini
  - **Vision Mode**: NVIDIA NEVA-22B
- **🎨 Creative Synthesis**: Integrated **Stable Diffusion XL** for images and **SVD** for video generation.
- **🔍 Deep Research**: Autonomous web-wide research with structured report generation.
- **🧬 Biological Node**: Integrated **ESMFold** for real-time protein structure prediction.
- **🎙️ Neural ASR**: High-fidelity speech-to-text using Nemotron-ASR.
- **🔐 100% Stateless**: No local database. Instant access via JWT-based guest authentication.
- **🌈 Vibrant UI**: State-of-the-art glassmorphism design with animated Aurora blobs and high-fidelity gradients.

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML5, CSS3 (Vibrant Design System), JavaScript (ES6+).
- **Backend**: Node.js, Express.
- **Auth**: Stateless JWT (JsonWebToken).
- **AI Infrastructure**: NVIDIA NIM (Inference Microservices).
- **Storage**: Temporary local `uploads/` for generated assets.

## ⚙️ Quick Start

### 1. Configure Environment
Create a `.env` file in the root directory:

```env
PORT=3005
JWT_SECRET=your_secure_jwt_secret

# NVIDIA API KEYS
NVIDIA_API_KEY=nvapi-...
NVIDIA_IMAGE_API_KEY=nvapi-...
NVIDIA_LLAMA_API_KEY=nvapi-...
NVIDIA_PHI_API_KEY=nvapi-...
NVIDIA_NEMOTRON_API_KEY=nvapi-...
NVIDIA_ASR_API_KEY=nvapi-...
NVIDIA_ESMFOLD_API_KEY=nvapi-...
```

### 2. Install & Run
```bash
# Install dependencies
npm install

# Start the gateway
npm start
```

Open [http://localhost:3005](http://localhost:3005) to begin.

## 📂 Architecture

- `/frontend`: Responsive, ultra-vibrant client-side application.
- `/backend/server.js`: Unified server for static hosting and API proxying.
- `/backend/routes`: Modular API handlers for each AI capability.
- `/backend/middleware`: Secure stateless authentication guards.

---
**NEXUS PRIME OMEGA** — *See everything. Create everything. Know everything.*
