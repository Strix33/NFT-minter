# NFT-minter

<h3>A Full-Stack NFT Minting DApp built with Python (Flask), Solidity, Web3.js, and IPFS</h3>
<h5>Mint ERC-721 NFTs directly from your browser — upload your asset, generate IPFS metadata, and sign a blockchain transaction with MetaMask</h5>

<br/>

<p align="center">
  <img src="https://github.com/Strix33/NFT-minter/blob/main/image/home.png" width="500" height="270">
  <img src="https://github.com/Strix33/NFT-minter/blob/main/image/marketplace.png" width="500" height="270">
</p>

---

## ✨ Features

- 🦊 **MetaMask Wallet Integration** — Connect your wallet with one click, auto-detects Sepolia, Mainnet, and local Ganache networks
- 🗂️ **IPFS Asset Upload** — Upload images directly to your local IPFS node; metadata JSON is generated and pinned automatically
- 🔗 **IPFS Link Mode** — Already have an IPFS CID? Paste it in and mint without uploading again
- ⛏️ **On-Chain Minting** — Calls `mintNFT()` on your deployed ERC-721 smart contract and returns a token ID
- 📊 **Transaction Receipt** — Shows block number, gas used, contract address, and network ID after every mint
- 🌐 **NFT Marketplace View** — Browse all previously minted NFTs, fetch metadata from IPFS gateways, and view details
- 🚀 **Smart Contract Deployer** — Deploy a new instance of the NFT Minter contract from within the DApp itself
- ⚡ **IPFS Status Monitor** — Live badge shows whether your local IPFS daemon is online or offline
- 🎨 **Modern Dark UI** — Premium glassmorphism design with cyan/purple gradients and micro-animations

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3, Flask |
| Smart Contracts | Solidity (ERC-721 via OpenZeppelin), Brownie |
| Blockchain Interaction | ethers.js v5, MetaMask |
| Decentralized Storage | IPFS (local daemon via HTTP API on port 5001) |
| Frontend | Vanilla HTML/CSS/JS, Lexend + JetBrains Mono fonts |

---

## 📋 Prerequisites

Please install or have the following ready before starting:

- [Python 3.8+](https://www.python.org/downloads/)
- [MetaMask](https://metamask.io/download/) browser extension
- [IPFS Desktop](https://docs.ipfs.tech/install/ipfs-desktop/) — required for asset uploads
- A funded wallet on Sepolia testnet (use [Sepolia Faucet](https://sepoliafaucet.com/)) or a local Ganache instance

---

## ⚙️ Installation

### 1. Clone the repository
```bash
git clone https://github.com/Strix33/NFT-minter.git
cd NFT-minter
```

### 2. Set up a virtual environment
```bash
python -m pip install --user virtualenv
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate
```

### 3. Install Python dependencies
```bash
pip install flask web3 requests python-dotenv
```

---

## 🚀 Usage

### Step 1 — Start IPFS
Open **IPFS Desktop** or run:
```bash
ipfs daemon
```
The app expects the IPFS HTTP API to be available at `http://127.0.0.1:5001`.

### Step 2 — Deploy the Smart Contract

**Option A: Deploy from the DApp UI**
1. Start the Flask server (Step 3 below)
2. Navigate to `http://127.0.0.1:3000/deploy`
3. Connect MetaMask and click **Deploy Contract**
4. Copy the deployed contract address

**Option B: Deploy via Brownie (CLI)**
```bash
cd contracts
brownie run scripts/deploy.py --network sepolia
```

### Step 3 — Run the Flask App
```bash
cd src
python app.py
```
App will start at: **`http://127.0.0.1:3000`**

### Step 4 — Mint your NFT
1. Open `http://127.0.0.1:3000` in your browser
2. Click **Connect MetaMask** and approve the connection
3. Enter your NFT name and description
4. Upload an image asset (JPEG, PNG, GIF, etc.)
5. Click **Confirm & Mint Asset** and sign the MetaMask transaction
6. View your minted NFT details including token ID, transaction hash, and IPFS links

---

## 📁 Project Structure

```
NFT-minter/
├── contracts/
│   ├── contracts/
│   │   └── nft_minter.sol        # ERC-721 Solidity contract
│   ├── scripts/
│   │   ├── deploy.py             # Standard deploy script
│   │   ├── deploy_and_fund.py    # Deploy + fund wallet helper
│   │   └── fast_deploy.py        # Quick deploy for testing
│   └── brownie-config.yaml
├── src/
│   ├── app.py                    # Flask backend + IPFS handlers
│   ├── config.py                 # IPFS config
│   ├── nftMinter.json            # Compiled contract ABI
│   └── templates/
│       ├── page_3.html           # NFT Minter UI (main page)
│       ├── marketplace.html      # NFT Marketplace view
│       └── deploy.html           # Smart Contract deployer
├── image/                        # Project screenshots
├── .gitignore
├── LICENSE.md
└── README.md
```

---

## 🔗 Resources

- [Getting Started with Flask](https://flask.palletsprojects.com/en/2.3.x/quickstart/)
- [Getting Started with Brownie](https://eth-brownie.readthedocs.io/en/stable/)
- [IPFS HTTP Client Docs](https://docs.ipfs.tech/reference/kubo/rpc/)
- [OpenZeppelin ERC-721 Docs](https://docs.openzeppelin.com/contracts/4.x/erc721)
- [ethers.js v5 Docs](https://docs.ethers.org/v5/)
- [Sepolia Testnet Faucet](https://sepoliafaucet.com/)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE.md).
