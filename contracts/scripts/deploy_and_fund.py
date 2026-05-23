from brownie import nftMinter, accounts, network, Wei

def main():
    recipient = "0x8dE930dbAd0D99759Db57C2F906010f87D4185FF"
    print(f"Target recipient: {recipient}")
    
    # Use the first account from Ganache
    dev = accounts[0]
    print(f"Deploying from: {dev.address}")
    
    # 1. Send 50 ETH
    print(f"Sending 50 ETH to {recipient}...")
    dev.transfer(recipient, "50 ether")
    print(f"Funding complete! {recipient} balance: {accounts.at(recipient).balance() / 1e18} ETH")
    
    # 2. Deploy Contract
    print("Deploying NFT Minter contract...")
    contract = nftMinter.deploy({'from': dev})
    print(f"Contract deployed at: {contract.address}")
    
    # Save the address to a temp file for the agent to read
    with open("new_contract_address.txt", "w") as f:
        f.write(contract.address)
