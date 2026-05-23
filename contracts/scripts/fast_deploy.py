import json
import os
from web3 import Web3

def main():
    # Connect to Ganache
    w3 = Web3(Web3.HTTPProvider('http://127.0.0.1:8545'))
    if not w3.is_connected():
        print("Failed to connect to Ganache at 127.0.0.1:8545")
        return

    recipient = "0x8dE930dbAd0D99759Db57C2F906010f87D4185FF"
    
    # 1. Fund the wallet
    sender = w3.eth.accounts[0]
    print(f"Funding from: {sender}")
    
    tx_hash = w3.eth.send_transaction({
        'from': sender,
        'to': recipient,
        'value': w3.to_wei(50, 'ether')
    })
    print(f"Funded 50 ETH. Tx Hash: {tx_hash.hex()}")
    
    # 2. Deploy Contract
    # Load ABI and Bytecode from Brownie build
    build_path = 'build/contracts/nftMinter.json'
    with open(build_path) as f:
        data = json.load(f)
        abi = data['abi']
        bytecode = data['bytecode']

    Minter = w3.eth.contract(abi=abi, bytecode=bytecode)
    
    tx_hash = Minter.constructor().transact({'from': sender})
    tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    
    print(f"Contract Deployed! Address: {tx_receipt.contractAddress}")
    
    # Write to file for the agent to find
    with open("deployed_addr.txt", "w") as f:
        f.write(tx_receipt.contractAddress)

if __name__ == "__main__":
    main()
