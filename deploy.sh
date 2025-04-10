#!/bin/bash

# Script de déploiement pour l'application Synergia-Bank
# À exécuter depuis le dossier racine où se trouve app.py

# Configuration
SERVER_IP="13.61.174.161"
DOMAIN="synergia-bank.com"
APP_DIR="/opt/synergia-bank"
VENV_DIR="$APP_DIR/venv"
USER="ubuntu"
EMAIL="admin@$DOMAIN"  # Email pour Let's Encrypt

# Couleurs pour les messages
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les étapes
log() {
    echo -e "${GREEN}[+] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[!] $1${NC}"
}

error() {
    echo -e "${RED}[-] $1${NC}" >&2
}

# Vérification de l'exécution en tant que root
if [ "$EUID" -ne 0 ]; then
  error "Ce script doit être exécuté en tant que root."
  echo "Essayez: sudo $0"
  exit 1
fi

# Mise à jour du système
log "Mise à jour du système..."
apt-get update && apt-get upgrade -y

# Installation des dépendances
log "Installation des dépendances système..."
apt-get install -y python3 python3-pip python3-venv nginx certbot python3-certbot-nginx

# Création du répertoire de l'application
log "Création du répertoire de l'application..."
mkdir -p $APP_DIR
mkdir -p $APP_DIR/logs
mkdir -p $APP_DIR/templates
mkdir -p $APP_DIR/static/css
mkdir -p $APP_DIR/static/js
mkdir -p $APP_DIR/static/img

# Définition des permissions
chown -R $USER:$USER $APP_DIR

# Copie des fichiers de l'application
log "Copie des fichiers de l'application..."
cp app.py config.py $APP_DIR/
cp -r templates/* $APP_DIR/templates/
cp -r static/* $APP_DIR/static/

# Création de l'environnement virtuel Python et installation des dépendances
log "Création de l'environnement virtuel Python..."
python3 -m venv $VENV_DIR
$VENV_DIR/bin/pip install --upgrade pip
$VENV_DIR/bin/pip install flask gunicorn

# Configuration du service systemd
log "Configuration du service systemd..."
cat > /etc/systemd/system/synergia-bank.service << EOF
[Unit]
Description=Synergia Bank Application
After=network.target

[Service]
User=$USER
Group=www-data
WorkingDirectory=$APP_DIR
Environment="PATH=$VENV_DIR/bin"
ExecStart=$VENV_DIR/bin/gunicorn --workers 3 --bind unix:$APP_DIR/synergia-bank.sock -m 007 app:app

[Install]
WantedBy=multi-user.target
EOF

# Configuration de Nginx
log "Configuration de Nginx..."
cat > /etc/nginx/sites-available/synergia-bank << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location = /favicon.ico { access_log off; log_not_found off; }
    
    location /static/ {
        root $APP_DIR;
    }

    location / {
        include proxy_params;
        proxy_pass http://unix:$APP_DIR/synergia-bank.sock;
    }
}
EOF

# Activer la configuration Nginx
ln -sf /etc/nginx/sites-available/synergia-bank /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Vérifier la configuration de Nginx
nginx -t 2>/dev/null
if [ $? -ne 0 ]; then
    error "Configuration Nginx invalide. Annulation du déploiement."
    nginx -t
    exit 1
fi

# Démarrer les services
log "Démarrage des services..."
systemctl daemon-reload
systemctl enable synergia-bank
systemctl start synergia-bank
systemctl restart nginx

# Obtenir un certificat SSL avec Certbot
log "Configuration du certificat SSL avec Let's Encrypt..."
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m $EMAIL

if [ $? -ne 0 ]; then
    warning "Échec de la configuration automatique du certificat SSL. Tentative manuelle..."
    certbot --nginx -d $DOMAIN -d www.$DOMAIN
    
    if [ $? -ne 0 ]; then
        error "Impossible d'obtenir un certificat SSL. Vérifiez que les DNS sont correctement configurés."
        error "L'application est accessible en HTTP, mais pas en HTTPS."
    fi
else
    log "Certificat SSL installé avec succès!"
fi

# Redémarrer Nginx pour appliquer les modifications SSL
systemctl restart nginx

# Configuration du renouvellement automatique du certificat
log "Configuration du renouvellement automatique du certificat..."
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet") | crontab -

# Vérifier que l'application fonctionne
log "Vérification du déploiement..."
systemctl status synergia-bank --no-pager
curl -s -o /dev/null -w "%{http_code}" http://localhost/

if [ $? -eq 0 ]; then
    log "=================================================================="
    log "  Déploiement terminé avec succès!"
    log "  L'application est accessible à l'adresse suivante:"
    log "  https://$DOMAIN"
    log "=================================================================="
else
    error "Le déploiement a échoué. Vérifiez les logs pour plus de détails."
    error "Logs de l'application: journalctl -u synergia-bank.service"
    error "Logs de Nginx: /var/log/nginx/error.log"
fi