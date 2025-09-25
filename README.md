To run the application locally on your device follow these steps-
1. Clone the repository
2. navigate to repo and then to backend.
3. create a python virtual environment using
  -python -m venv .venv or python3 -m venv .venv (for windows)
  -python -m venv venv or python3 -m venv venv (for MacOS)
4. Now activating the virtual environment, at same location-
   -.venv\Scripts\Activate (for windows)
   -source venv/bin/activate
5. Now install the necessary packages-(use pip3 if python3 is installed on the system)
  -pip install fastapi uvicorn pandas numpy scikit-learn bcrypt PyJWT PyPDF2 python-docx python-multipart requests pydantic email-validator
6. Now in another terminal or new cmd window navigate to the same repo but to the frontend folder and run npm install
7. Then go back to the backend terminal and run python or python3 api.py
8. In the frontend terminal run npm run dev, and then enjoy the project on localhost
