import os
import json
import requests
from flask import Flask, render_template, request, redirect, url_for, jsonify
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.debug = True
app.config.from_pyfile('config.py')

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
    """Checks if the local IPFS daemon is reachable."""
    try:
        r = requests.post("http://127.0.0.1:5001/api/v0/id", timeout=2)
        if r.status_code == 200:
            return jsonify({"online": True, "version": r.json()['AgentVersion']})
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
            # 1. Upload the asset file
            img_res = requests.post('http://127.0.0.1:5001/api/v0/add', files={'file': nft_file})
            img_res.raise_for_status()
            file_info = img_res.json()
            nft_file_url = app.config['IPFS_FILE_URL'] + file_info['Hash']

            # 2. Create Metadata
            NFT_info = {
                "name": title,
                "description": description,
                "image": nft_file_url,
                "owner": owner_address,
                "attributes": []
            }
            
            # Write temp JSON
            temp_json = f'metadata_{file_info["Hash"]}.json'
            with open(temp_json, 'w') as f:
                json.dump(NFT_info, f, indent=4)
            
            # 3. Upload Metadata JSON
            with open(temp_json, 'rb') as f:
                meta_res = requests.post('http://127.0.0.1:5001/api/v0/add', files={'file': f})
            meta_res.raise_for_status()
            meta_info = meta_res.json()
            metadata_url = app.config['IPFS_FILE_URL'] + meta_info['Hash']
            
            # Cleanup
            os.remove(temp_json)

            return jsonify({
                "success": True,
                "metadata_url": metadata_url,
                "hash": meta_info['Hash']
            })
            
        except Exception as e:
            print(f"IPFS Error: {e}")
            return jsonify({
                "success": False, 
                "error": "IPFS Connection Failed. Please ensure IPFS Desktop is running on port 5001."
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
