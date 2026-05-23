/* =============================================
   NFT Marketplace — marketplace.js
   ============================================= */

const defaultContract = "0xb5cEe73CC170D760Ce72817119b79801eE0D461F";
const abi = [
    "function getItemId() public view returns(uint256)",
    "function tokenURI(uint256 tokenId) public view returns (string memory)",
    "function ownerOf(uint256 tokenId) public view returns (address)"
];

const grid = document.getElementById('grid');
const loader = document.getElementById('loader');
const emptyState = document.getElementById('emptyState');

async function loadNFTs() {
    try {
        let provider;
        if (typeof window.ethereum !== 'undefined') {
            provider = new ethers.providers.Web3Provider(window.ethereum);
        } else {
            provider = new ethers.providers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
        }

        const contract = new ethers.Contract(defaultContract, abi, provider);
        const totalIds = await contract.getItemId();
        const count = totalIds.toNumber();

        if (count === 0) {
            loader.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        for (let i = count - 1; i >= 0; i--) {
            let owner = "Unknown";
            let uri = "";
            try {
                const results = await Promise.all([
                    contract.tokenURI(i),
                    contract.ownerOf(i)
                ]);
                uri = results[0];
                owner = results[1];
                
                let cid = "";
                if (uri.includes('/ipfs/')) cid = uri.split('/ipfs/')[1];
                else if (uri.includes('/ipns/')) cid = uri.split('/ipns/')[1];
                else if (uri.startsWith('ipfs://')) cid = uri.replace('ipfs://', '');
                else if (uri.startsWith('ipns://')) cid = uri.replace('ipns://', '');
                else cid = uri.split('/').pop();

                let res = await fetch('/metadata/' + cid);
                if (!res.ok) throw new Error(`Gateway returned ${res.status}`);
                
                const metadata = await res.json();
                if (metadata.error) throw new Error(metadata.error);
                renderNFT(i, metadata, owner);
                
            } catch (err) {
                console.error(`Error loading metadata for NFT ${i}:`, err);
                renderFallbackNFT(i, owner, uri);
            }
        }

        loader.style.display = 'none';
    } catch (err) {
        console.error("Marketplace Error:", err);
        loader.innerHTML = `<p style="color: #ff4d4d">Connection Error: ${err.message}</p>`;
    }
}

function renderFallbackNFT(id, owner, uri) {
    const card = document.createElement('div');
    card.className = 'nft-card';
    
    const shortOwner = owner && owner !== "Unknown" ? owner.substring(0, 6) + '...' + owner.substring(38) : "Unknown";
    const fullUri = uri || "No URI";

    card.innerHTML = `
        <div style="width: 100%; aspect-ratio: 1; border-radius: 20px; background: rgba(255,255,255,0.05); border: 1px dashed rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; margin-bottom: 20px; flex-direction: column; text-align: center; padding: 20px; word-break: break-all;">
            <span style="font-size: 2rem; margin-bottom: 10px;">🔗</span>
            <span style="font-size: 0.6rem; color: var(--text-dim);">${fullUri}</span>
        </div>
        <div class="nft-info">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span class="nft-id">TOKEN #${id}</span>
                <span style="font-size: 0.6rem; color: #ffaa00; background: rgba(255, 170, 0, 0.1); padding: 2px 6px; border-radius: 4px;">SYNCING / RAW</span>
            </div>
            <div class="nft-title">Minted Asset</div>
            <div class="nft-desc" style="font-family: monospace; font-size: 0.65rem; word-break: break-all; height: auto;">URI: <a href="${fullUri}" target="_blank" style="color: var(--accent-primary); text-decoration: none;">${fullUri}</a></div>
            
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--card-border); display: flex; align-items: center; gap: 8px;">
                <div style="width: 24px; height: 24px; border-radius: 50%; background: linear-gradient(45deg, #444, #888);"></div>
                <div style="flex: 1;">
                    <div style="font-size: 0.55rem; color: var(--text-dim); text-transform: uppercase; font-weight: 800;">Current Owner</div>
                    <div style="font-size: 0.7rem; color: var(--text-main); font-family: 'JetBrains Mono', monospace;">${shortOwner}</div>
                </div>
            </div>
        </div>
    `;
    grid.appendChild(card);
}

function renderNFT(id, metadata, owner) {
    const card = document.createElement('div');
    card.className = 'nft-card';
    
    let imageUrl = metadata.image || "";
    let primaryUrl = imageUrl;
    let fallbacks = [];

    let cidImg = "";
    if (imageUrl.includes('/ipfs/')) cidImg = imageUrl.split('/ipfs/')[1];
    else if (imageUrl.startsWith('ipfs://')) cidImg = imageUrl.replace('ipfs://', '');
    else if (!imageUrl.startsWith('http')) cidImg = imageUrl;

    if (cidImg) {
        const localUrl = `http://127.0.0.1:8080/ipfs/${cidImg}`;
        const pinataUrl = `https://gateway.pinata.cloud/ipfs/${cidImg}`;
        const publicUrl = `https://ipfs.io/ipfs/${cidImg}`;
        const cloudflareUrl = `https://cloudflare-ipfs.com/ipfs/${cidImg}`;
        const placeholderUrl = `https://via.placeholder.com/400?text=NFT+Asset`;

        primaryUrl = localUrl;
        fallbacks = [pinataUrl, publicUrl, cloudflareUrl, placeholderUrl];
    } else {
        if (imageUrl.startsWith('https://gateway.pinata.cloud/ipfs/')) {
            const cid = imageUrl.replace('https://gateway.pinata.cloud/ipfs/', '');
            fallbacks = [
                `http://127.0.0.1:8080/ipfs/${cid}`,
                `https://ipfs.io/ipfs/${cid}`,
                `https://cloudflare-ipfs.com/ipfs/${cid}`,
                `https://via.placeholder.com/400?text=NFT+Asset`
            ];
        } else if (imageUrl.startsWith('https://ipfs.io/ipfs/')) {
            const cid = imageUrl.replace('https://ipfs.io/ipfs/', '');
            fallbacks = [
                `http://127.0.0.1:8080/ipfs/${cid}`,
                `https://gateway.pinata.cloud/ipfs/${cid}`,
                `https://cloudflare-ipfs.com/ipfs/${cid}`,
                `https://via.placeholder.com/400?text=NFT+Asset`
            ];
        }
    }

    let onerrorAttr = "";
    if (fallbacks.length > 0) {
        onerrorAttr = `onerror="this.onerror=null; `;
        for (let idx = 0; idx < fallbacks.length; idx++) {
            if (idx === 0) {
                onerrorAttr += `this.src='${fallbacks[idx]}'; this.onerror=function() { `;
            } else if (idx === fallbacks.length - 1) {
                onerrorAttr += `this.onerror=null; this.src='${fallbacks[idx]}';`;
            } else {
                onerrorAttr += `this.onerror=null; this.src='${fallbacks[idx]}'; this.onerror=function() { `;
            }
        }
        onerrorAttr += ' }'.repeat(fallbacks.length - 1) + '"';
    }

    const shortOwner = owner.substring(0, 6) + '...' + owner.substring(38);

    card.innerHTML = `
        <img src="${primaryUrl}" class="nft-image" alt="${metadata.name}" ${onerrorAttr}>
        <div class="nft-info">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span class="nft-id">TOKEN #${id}</span>
                <span style="font-size: 0.6rem; color: var(--success-color); background: rgba(0, 255, 136, 0.1); padding: 2px 6px; border-radius: 4px;">ACTIVE</span>
            </div>
            <div class="nft-title">${metadata.name}</div>
            <div class="nft-desc">${metadata.description}</div>
            
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--card-border); display: flex; align-items: center; gap: 8px;">
                <div style="width: 24px; height: 24px; border-radius: 50%; background: linear-gradient(45deg, var(--accent-primary), var(--accent-secondary));"></div>
                <div style="flex: 1;">
                    <div style="font-size: 0.55rem; color: var(--text-dim); text-transform: uppercase; font-weight: 800;">Current Owner</div>
                    <div style="font-size: 0.7rem; color: var(--text-main); font-family: 'JetBrains Mono', monospace;">${shortOwner}</div>
                </div>
            </div>
        </div>
    `;
    
    card.onclick = () => {
        window.open(`https://testnets.opensea.io/assets/sepolia/${defaultContract}/${id}`, '_blank');
    };

    grid.appendChild(card);
}

window.onload = loadNFTs;
