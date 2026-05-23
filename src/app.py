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

IS_RENDER = os.environ.get('RENDER', 'false').lower() == 'true'
PINATA_API_KEY = os.environ.get('PINATA_API_KEY', '')
PINATA_SECRET_KEY = os.environ.get('PINATA_SECRET_KEY', '')
PINATA_BASE_URL = 'https://api.pinata.cloud'

def pinata_headers():
    return {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_KEY
    }

def upload_to_local_ipfs(file_stream, filename, mimetype):
    try:
        url = "http://127.0.0.1:5001/api/v0/add"
        files = {'file': (filename, file_stream, mimetype)}
        response = requests.post(url, files=files, timeout=10)
        response.raise_for_status()
        result = response.json()
        return result.get('Hash')
    except Exception as e:
        print(f"Local IPFS Upload Error: {e}")
        return None

def upload_json_to_local_ipfs(json_data):
    try:
        url = "http://127.0.0.1:5001/api/v0/add"
        files = {
            'file': ('metadata.json', json.dumps(json_data), 'application/json')
        }
        response = requests.post(url, files=files, timeout=10)
        response.raise_for_status()
        result = response.json()
        return result.get('Hash')
    except Exception as e:
        print(f"Local IPFS JSON Upload Error: {e}")
        return None

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
    """Checks if Pinata cloud or Local IPFS is reachable."""
    # 1. Try Pinata if keys are set
    if PINATA_API_KEY and PINATA_SECRET_KEY:
        try:
            r = requests.get(f"{PINATA_BASE_URL}/data/testAuthentication",
                             headers=pinata_headers(), timeout=3)
            if r.status_code == 200:
                return jsonify({"online": True, "mode": "pinata", "version": "Pinata Cloud"})
        except Exception as e:
            print(f"Pinata test authentication failed: {e}")
            pass

    # 2. Try Local IPFS if NOT on Render
    if not IS_RENDER:
        try:
            r = requests.post("http://127.0.0.1:5001/api/v0/version", timeout=3)
            if r.status_code == 200:
                version_data = r.json()
                return jsonify({
                    "online": True,
                    "mode": "local",
                    "version": f"Local IPFS v{version_data.get('Version', 'unknown')}"
                })
        except Exception as e:
            print(f"Local IPFS version check failed: {e}")
            pass

    return jsonify({
        "online": False,
        "error": "Neither Pinata Cloud nor local IPFS daemon is running/configured."
    })

@app.route("/nftMinter", methods=["GET", "POST"])
def nft_minter():
    if request.method == "POST":
        title = request.form.get('content1')
        description = request.form.get('content5')
        owner_address = request.form.get('owner_address', 'Unknown')
        nft_file = request.files['file']
        
        try:
            img_hash = None
            nft_file_url = None
            mode_used = "pinata"

            # 1. Try Pinata first if keys are configured
            if PINATA_API_KEY and PINATA_SECRET_KEY:
                try:
                    img_res = requests.post(
                        f"{PINATA_BASE_URL}/pinning/pinFileToIPFS",
                        files={'file': (nft_file.filename, nft_file.stream, nft_file.mimetype)},
                        headers=pinata_headers(),
                        timeout=30
                    )
                    img_res.raise_for_status()
                    img_hash = img_res.json()['IpfsHash']
                    nft_file_url = f"https://gateway.pinata.cloud/ipfs/{img_hash}"
                except Exception as pinata_err:
                    print(f"Pinata asset upload failed: {pinata_err}")
                    if IS_RENDER:
                        raise pinata_err

            # 2. Fallback to Local IPFS if not on Render and Pinata failed/not configured
            if not img_hash and not IS_RENDER:
                print("Pinata not configured or failed. Attempting local IPFS upload...")
                img_hash = upload_to_local_ipfs(nft_file.stream, nft_file.filename, nft_file.mimetype)
                if img_hash:
                    nft_file_url = f"ipfs://{img_hash}"
                    mode_used = "local"

            if not img_hash or not nft_file_url:
                raise Exception("Failed to upload image asset to IPFS (both Pinata and Local methods failed or were unavailable)")

            # Create Metadata JSON
            NFT_info = {
                "name": title,
                "description": description,
                "image": nft_file_url,
                "owner": owner_address,
                "attributes": []
            }

            meta_hash = None
            metadata_url = None

            # 3. Try to upload metadata JSON to Pinata if in Pinata mode
            if mode_used == "pinata":
                try:
                    meta_res = requests.post(
                        f"{PINATA_BASE_URL}/pinning/pinJSONToIPFS",
                        json={
                            "pinataContent": NFT_info,
                            "pinataMetadata": {"name": f"{title}_metadata.json"}
                        },
                        headers={**pinata_headers(), 'Content-Type': 'application/json'},
                        timeout=30
                    )
                    meta_res.raise_for_status()
                    meta_hash = meta_res.json()['IpfsHash']
                    metadata_url = f"https://gateway.pinata.cloud/ipfs/{meta_hash}"
                except Exception as pinata_err:
                    print(f"Pinata metadata upload failed: {pinata_err}")
                    if IS_RENDER:
                        raise pinata_err

            # 4. Fallback to Local IPFS for metadata
            if not meta_hash and not IS_RENDER:
                print("Attempting local IPFS metadata upload...")
                meta_hash = upload_json_to_local_ipfs(NFT_info)
                if meta_hash:
                    metadata_url = f"ipfs://{meta_hash}"

            if not meta_hash or not metadata_url:
                raise Exception("Failed to upload metadata JSON to IPFS")

            return jsonify({
                "success": True,
                "metadata_url": metadata_url,
                "hash": meta_hash,
                "mode": mode_used
            })

        except Exception as e:
            print(f"Upload Error: {e}")
            return jsonify({
                "success": False,
                "error": f"IPFS upload failed: {str(e)}"
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
    # If we are local, query local gateway first. If on Render, skip local to avoid timeouts.
    gateways = []
    if not IS_RENDER:
        gateways.append("http://127.0.0.1:8080")
    
    gateways.extend([
        "https://gateway.pinata.cloud",
        "https://ipfs.io",
        "https://dweb.link",
        "https://cloudflare-ipfs.com"
    ])
    
    paths = [f"/ipfs/{cid}", f"/ipns/{cid}"]
    
    for gw in gateways:
        for path in paths:
            try:
                r = requests.get(gw + path, timeout=3 if "127.0.0.1" in gw else 10)
                if r.status_code == 200:
                    return jsonify(r.json())
            except Exception as e:
                pass

    return jsonify({"error": "Metadata not found"}), 404

if __name__ == '__main__':
    app.run(port=3000, debug=True)
