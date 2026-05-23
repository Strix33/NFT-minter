import os
import json
import requests
from flask import Flask, render_template, request, redirect, url_for, jsonify
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
try:
    app.config.from_pyfile('config.py')
except Exception:
    pass  # config.py is optional in cloud deployments

PINATA_API_KEY = os.environ.get('PINATA_API_KEY', '')
PINATA_SECRET_KEY = os.environ.get('PINATA_SECRET_KEY', '')
PINATA_BASE_URL = 'https://api.pinata.cloud'

def pinata_headers():
    return {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_KEY
    }

@app.after_request
def add_header(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '-1'
    return response

@app.route("/")
def index():
    return redirect(url_for('nft_minter'))

@app.route("/ipfs_status")
def ipfs_status():
    """Checks if Pinata cloud IPFS is reachable."""
    if not PINATA_API_KEY or not PINATA_SECRET_KEY:
        return jsonify({"online": False, "error": "Pinata API keys not configured"})
    try:
        r = requests.get(f"{PINATA_BASE_URL}/data/testAuthentication",
                         headers=pinata_headers(), timeout=5)
        if r.status_code == 200:
            return jsonify({"online": True, "version": "Pinata Cloud"})
        return jsonify({"online": False, "error": r.text})
    except Exception as e:
        return jsonify({"online": False, "error": str(e)})

@app.route("/nftMinter", methods=["GET", "POST"])
def nft_minter():
    if request.method == "POST":
        title = request.form.get('content1')
        description = request.form.get('content5')
        owner_address = request.form.get('owner_address', 'Unknown')
        nft_file = request.files['file']
        
        try:
            # 1. Upload the image asset to Pinata
            img_res = requests.post(
                f"{PINATA_BASE_URL}/pinning/pinFileToIPFS",
                files={'file': (nft_file.filename, nft_file.stream, nft_file.mimetype)},
                headers=pinata_headers()
            )
            img_res.raise_for_status()
            img_hash = img_res.json()['IpfsHash']
            nft_file_url = f"https://gateway.pinata.cloud/ipfs/{img_hash}"

            # 2. Create Metadata JSON
            NFT_info = {
                "name": title,
                "description": description,
                "image": nft_file_url,
                "owner": owner_address,
                "attributes": []
            }

            # 3. Upload Metadata JSON to Pinata
            meta_res = requests.post(
                f"{PINATA_BASE_URL}/pinning/pinJSONToIPFS",
                json={
                    "pinataContent": NFT_info,
                    "pinataMetadata": {"name": f"{title}_metadata.json"}
                },
                headers={**pinata_headers(), 'Content-Type': 'application/json'}
            )
            meta_res.raise_for_status()
            meta_hash = meta_res.json()['IpfsHash']
            metadata_url = f"https://gateway.pinata.cloud/ipfs/{meta_hash}"

            return jsonify({
                "success": True,
                "metadata_url": metadata_url,
                "hash": meta_hash
            })

        except Exception as e:
            print(f"Pinata Upload Error: {e}")
            return jsonify({
                "success": False,
                "error": f"Cloud upload failed: {str(e)}"
            }), 503
    
    return render_template("page_3.html")

@app.route("/marketplace")
def marketplace():
    return render_template("marketplace.html")

@app.route("/deploy")
def deploy():
    json_path = os.path.join(os.path.dirname(__file__), 'nftMinter.json')
    with open(json_path) as file:
        data = json.load(file)
    return render_template("deploy.html", abi=json.dumps(data["abi"]), bytecode=data["bytecode"])

@app.route("/metadata/<cid>")
def get_metadata(cid):
    gateways = [
        "http://127.0.0.1:8080",
        "https://ipfs.io",
        "https://dweb.link",
        "https://cloudflare-ipfs.com"
    ]
    
    paths = [f"/ipfs/{cid}", f"/ipns/{cid}"]
    
    for gw in gateways:
        for path in paths:
            try:
                r = requests.get(gw + path, timeout=15)
                if r.status_code == 200:
                    return jsonify(r.json())
            except Exception as e:
                pass

    return jsonify({"error": "Metadata not found"}), 404

if __name__ == '__main__':
    app.run(port=3000, debug=True)
