/* =============================================
   NFT Minting Dashboard — minter.js
   ============================================= */

const defaultContract = "0xb5cEe73CC170D760Ce72817119b79801eE0D461F";
const abi = [
    "function mintNFT(string memory tokenURI) public returns (uint256)",
    "function getItemId() public view returns(uint256)",
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
    "event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)",
    "event ApprovalForAll(address indexed owner, address indexed operator, bool approved)"
];

let provider, signer, activeMode = 'upload', currentChainId = 0;

const connectBtn = document.getElementById('connectBtn');
const mintForm = document.getElementById('mintForm');
const statusDiv = document.getElementById('status');
const mintBtn = document.getElementById('mintBtn');

async function checkIpfsStatus() {
    try {
        const res = await fetch('/ipfs_status');
        const data = await res.json();
        const badge = document.getElementById('ipfsBadge');
        if (data.online) {
            badge.innerText = `IPFS: ONLINE (${data.mode === 'pinata' ? 'Pinata' : 'Local'})`;
            badge.classList.add('active');
            document.getElementById('ipfsWarning').style.display = 'none';
        } else {
            badge.innerText = "IPFS: OFFLINE";
            badge.classList.remove('active');
            if (activeMode === 'upload') {
                document.getElementById('ipfsWarning').style.display = 'block';
                document.getElementById('ipfsWarning').innerHTML = `
                    ⚠️ <strong>IPFS Storage is Offline</strong><br>
                    Please start your local IPFS Desktop or daemon, or configure Pinata API credentials in your environment.
                `;
            }
        }
    } catch { }
}

const tabUpload = document.getElementById('tabUpload');
const tabLink = document.getElementById('tabLink');
tabUpload.onclick = () => {
    activeMode = 'upload';
    tabUpload.classList.add('active'); tabLink.classList.remove('active');
    document.getElementById('uploadBox').classList.remove('hidden');
    document.getElementById('linkBox').classList.add('hidden');
    document.getElementById('file').required = true;
    document.getElementById('directLink').required = false;
    checkIpfsStatus();
};
tabLink.onclick = () => {
    activeMode = 'link';
    tabLink.classList.add('active'); tabUpload.classList.remove('active');
    document.getElementById('linkBox').classList.remove('hidden');
    document.getElementById('uploadBox').classList.add('hidden');
    document.getElementById('file').required = false;
    document.getElementById('directLink').required = true;
    document.getElementById('ipfsWarning').style.display = 'none';
};

async function connect() {
    if (typeof window.ethereum === 'undefined') return setStatus("MetaMask not found!", "error");
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        const network = await provider.getNetwork();
        const networkNames = {
            1: 'MAINNET',
            11155111: 'SEPOLIA',
            1337: 'GANACHE'
        };
        currentChainId = network.chainId;
        document.getElementById('netName').innerText = `Network: ${networkNames[currentChainId] || (network.name ? network.name.toUpperCase() : 'UNKNOWN')}`;
        document.getElementById('netName').classList.add('active');
        connectBtn.innerText = "Authorized ✅";
        connectBtn.classList.add('connected');
    } catch (err) { setStatus("Error: " + err.message, "error"); }
}

connectBtn.onclick = connect;

mintForm.onsubmit = async (e) => {
    e.preventDefault();
    if (!signer) return setStatus("Please connect wallet", "error");
    mintBtn.disabled = true;

    try {
        let metadataUrl = '';
        let metadataHash = '';

        if (activeMode === 'upload') {
            setStatus("Uploading to IPFS...");
            const formData = new FormData(mintForm);
            
            // Add Owner Address to Metadata
            const address = await signer.getAddress();
            formData.append('owner_address', address);

            const res = await fetch('/nftMinter', { method: 'POST', body: formData });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || "Upload Failed");
            metadataUrl = data.metadata_url;
            metadataHash = data.hash;
        } else {
            metadataUrl = document.getElementById('directLink').value;
            metadataHash = metadataUrl.split('/').pop().split(':').pop();
        }

        setStatus("Awaiting Signature...");
        const contract = new ethers.Contract(defaultContract, abi, signer);
        const tx = await contract.mintNFT(metadataUrl);
        
        setStatus("Mining Blockchain Receipt...");
        const receipt = await tx.wait();
        
        if (receipt.status === 0) throw new Error("Blockchain Transaction Failed. Please check your balance or contract state.");

        // Robust way to find the Transfer event
        let transferEvent = receipt.events?.find(x => x.event === 'Transfer');
        
        // Fallback: If ethers didn't automatically decode it (common in some v5 scenarios)
        if (!transferEvent && receipt.logs) {
            const iface = new ethers.utils.Interface(abi);
            for (const log of receipt.logs) {
                try {
                    const parsedLog = iface.parseLog(log);
                    if (parsedLog.name === 'Transfer') {
                        transferEvent = { args: parsedLog.args };
                        break;
                    }
                } catch (e) { /* Not a Transfer event */ }
            }
        }

        if (!transferEvent || !transferEvent.args) {
            throw new Error("Minting succeeded but Transfer event was not found in receipt. Please refresh.");
        }

        const tokenId = transferEvent.args.tokenId.toString();
        
        await showSuccessCard(metadataUrl, metadataHash, tokenId, receipt);
    } catch (err) {
        setStatus(err.message, "error");
        mintBtn.disabled = false;
    }
};

async function showSuccessCard(url, hash, id, receipt) {
    document.getElementById('resHash').innerText = receipt.transactionHash;
    document.getElementById('resBlock').innerText = receipt.blockNumber;
    document.getElementById('resGas').innerText = `${receipt.gasUsed.toString()} Units`;
    document.getElementById('resContract').innerText = defaultContract;
    document.getElementById('resNet').innerText = currentChainId === 11155111 ? `11155111 (Sepolia Testnet)` : (currentChainId || '1337 (Local Ganache)');

    // Use local gateway or Pinata/public gateways for links
    const pinataGw = 'https://gateway.pinata.cloud/ipfs/';
    const publicGw = 'https://ipfs.io/ipfs/';
    const localGw = 'http://127.0.0.1:8080/ipfs/';

    document.getElementById('resLocalLink').href = `${localGw}${hash}`;
    document.getElementById('resPublicLink').href = `${publicGw}${hash}`;
    document.getElementById('resEtherscan').href = `https://sepolia.etherscan.io/tx/${receipt.transactionHash}`;
    document.getElementById('resEtherscan').innerText = '🔍 Etherscan (Explorer)';

    document.getElementById('resultTokenId').innerText = `#${id}`;
    document.getElementById('resultTitle').innerText = document.getElementById('nftTitle').value;
    document.getElementById('resultDescText').innerText = document.getElementById('nftDesc').value;

    // Check if we can display an instant local preview
    const fileInput = document.getElementById('file');
    let previewLoaded = false;
    if (activeMode === 'upload' && fileInput && fileInput.files && fileInput.files[0]) {
        try {
            document.getElementById('resultImage').src = URL.createObjectURL(fileInput.files[0]);
            previewLoaded = true;
        } catch (e) {
            console.warn("Failed to load local Object URL preview", e);
        }
    }

    if (!previewLoaded) {
        // Fallback: Build image URL by fetching metadata from IPFS gateways
        const gateways = [localGw, pinataGw, publicGw];
        let metadata = null;

        for (const gw of gateways) {
            try {
                const previewRes = await fetch(`${gw}${hash}`);
                if (previewRes.ok) {
                    metadata = await previewRes.json();
                    break;
                }
            } catch (err) {
                console.warn(`Failed to fetch metadata from ${gw}`, err);
            }
        }

        if (metadata && metadata.image) {
            let imgUrl = metadata.image;
            if (imgUrl.startsWith('ipfs://')) {
                const cidImg = imgUrl.replace('ipfs://', '');
                // Try loading from local IPFS gateway, fallback to Pinata gateway
                document.getElementById('resultImage').src = `${localGw}${cidImg}`;
                document.getElementById('resultImage').onerror = function() {
                    this.onerror = null;
                    this.src = `${pinataGw}${cidImg}`;
                    this.onerror = function() {
                        this.onerror = null;
                        this.src = `${publicGw}${cidImg}`;
                    };
                };
            } else {
                document.getElementById('resultImage').src = imgUrl;
            }
        } else {
            document.getElementById('resultImage').src = "https://via.placeholder.com/400?text=NFT+Minted";
        }
    }

    document.getElementById('formView').classList.add('hidden');
    document.getElementById('successView').style.display = 'block';
    setStatus("Minted Successfully!", "success");
}

function setStatus(text, type = 'info') {
    statusDiv.innerText = text;
    statusDiv.className = type === 'error' ? 'status-error' : 'status-info';
}

document.getElementById('mintAnotherBtn').onclick = () => window.location.reload();
window.onload = () => { checkIpfsStatus(); if (window.ethereum) connect(); };
