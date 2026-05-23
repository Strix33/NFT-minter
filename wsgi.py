import sys
import os

# Make sure Python can find the src package
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))
os.chdir(os.path.join(os.path.dirname(__file__), 'src'))

from app import app

if __name__ == '__main__':
    app.run()
