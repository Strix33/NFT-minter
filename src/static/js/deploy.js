/* =============================================
   Deploy Smart Contract — deploy.js
   ============================================= */

let provider, signer;
const connectBtn = document.getElementById('connectBtn');
const deployBtn = document.getElementById('deployBtn');
const statusBox = document.getElementById('statusBox');
const deployText = document.getElementById('deployText');
const deployLoader = document.getElementById('deployLoader');

async function connect() {
    if (typeof window.ethereum === 'undefined') {
        showStatus("MetaMask not found! Please install it.", true);
        return;
    }
    try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        
        const address = await signer.getAddress();
        connectBtn.innerHTML = `Connected: ${address.substring(0,6)}...${address.substring(38)}`;
        connectBtn.classList.add('connected');
        deployBtn.disabled = false;
        showStatus("Wallet connected. Ready to deploy.");
    } catch (err) {
        showStatus("Connection error: " + err.message, true);
    }
}

connectBtn.onclick = connect;

deployBtn.onclick = async () => {
    if (!signer) return;
    try {
        const abi = window.contractAbi;
        const bytecode = window.contractBytecode;

        if (!abi || !bytecode) {
            showStatus("Contract ABI or bytecode not loaded correctly.", true);
            return;
        }

        deployBtn.disabled = true;
        deployText.innerText = "Deploying...";
        deployLoader.style.display = "block";
        showStatus("Please approve the transaction in MetaMask...");

        const factory = new ethers.ContractFactory(abi, bytecode, signer);
        const contract = await factory.deploy();
        
        showStatus(`Transaction sent! Waiting for confirmation...<br><span class="mono">Tx Hash: ${contract.deployTransaction.hash}</span>`);
        
        await contract.deployTransaction.wait();

        statusBox.innerHTML = `
            <div class="success-text">🎉 Contract Deployed Successfully!</div>
            <div style="font-size: 0.8rem; color: var(--text-dim); margin-bottom: 5px;">Contract Address:</div>
            <div class="mono" style="color: var(--accent-primary); background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; border: 1px solid var(--accent-primary); user-select: all;">${contract.address}</div>
            <div style="margin-top: 15px; font-size: 0.8rem; color: #ffbd4d;">Please copy this address and use it in your Minting Dashboard or Marketplace!</div>
        `;
    } catch (err) {
        showStatus("Deployment failed: " + err.message, true);
    } finally {
        deployBtn.disabled = false;
        deployText.innerText = "Deploy Contract";
        deployLoader.style.display = "none";
    }
};

function showStatus(msg, isError = false) {
    statusBox.style.display = 'block';
    statusBox.innerHTML = msg;
    statusBox.style.color = isError ? 'var(--error-color)' : 'var(--text-main)';
    statusBox.style.borderColor = isError ? 'rgba(255, 77, 77, 0.3)' : 'var(--card-border)';
}

if (window.ethereum) connect();
