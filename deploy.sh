#!/bin/bash

# Script de déploiement pour l'application Synergia-Bank
# Ce script récupère l'application depuis GitHub et la déploie sur une instance EC2

# Configuration
SERVER_IP="13.61.174.161"
DOMAIN="synergia-bank.com"
GITHUB_REPO="https://github.com/Ramzibenchaabane/locate.git"
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
apt-get install -y python3 python3-pip python3-venv nginx certbot python3-certbot-nginx git

# Clonage du dépôt GitHub
log "Clonage du dépôt GitHub..."
if [ -d "$APP_DIR" ]; then
    warning "Le répertoire $APP_DIR existe déjà. Suppression..."
    rm -rf $APP_DIR
fi

git clone $GITHUB_REPO $APP_DIR
if [ $? -ne 0 ]; then
    error "Échec du clonage du dépôt. Vérifiez l'URL et la connectivité."
    exit 1
fi

log "Code récupéré avec succès depuis GitHub."

# Création du dossier de logs (s'il n'existe pas déjà)
mkdir -p $APP_DIR/logs
chown -R $USER:www-data $APP_DIR
chmod -R 755 $APP_DIR

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

# Configuration de Nginx avec en-têtes pour IP réelle
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
        
        # Ajout des en-têtes pour transmettre l'IP réelle du client
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Host \$host;
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

# Vérifier si les certificats existent déjà
log "Vérification des certificats SSL..."
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    log "Des certificats SSL existent déjà pour $DOMAIN."
    log "Validation et renouvellement si nécessaire..."
    certbot renew --nginx
    
    # Vérifier si le renouvellement a réussi
    if [ $? -ne 0 ]; then
        warning "Problème lors de la validation des certificats existants."
        warning "Tentative de nouvelle émission..."
        certbot --force-renewal --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m $EMAIL
    else
        log "Certificats SSL validés avec succès!"
    fi
else
    log "Configuration d'un nouveau certificat SSL avec Let's Encrypt..."
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
fi

# Redémarrer Nginx pour appliquer les modifications SSL
systemctl restart nginx

# Configuration du renouvellement automatique du certificat
log "Configuration du renouvellement automatique du certificat..."
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet") | crontab -

# Vérifier que l'application fonctionne
log "Vérification du déploiement..."
systemctl status synergia-bank --no-pager

# Afficher les informations finales
log "=================================================================="
log "  Déploiement terminé!"
log "  L'application est accessible à l'adresse suivante:"
log "  https://$DOMAIN"
log "=================================================================="
log "Pour vérifier les logs de l'application:"
log "  sudo journalctl -u synergia-bank.service"
log "Pour vérifier les logs de Nginx:"
log "  sudo tail -f /var/log/nginx/error.log"
log "=================================================================="
log "NOTE IMPORTANTE: Assurez-vous que dans votre code app.py,"
log "vous utilisez une fonction get_client_ip() qui récupère l'IP"
log "à partir des en-têtes X-Forwarded-For ou X-Real-IP."
log "Exemple de fonction à ajouter dans app.py:"
log ""
log "def get_client_ip():"
log "    if request.headers.get('X-Forwarded-For'):"
log "        client_ip = request.headers.get('X-Forwarded-For').split(',')[0].strip()"
log "    elif request.headers.get('X-Real-IP'):"
log "        client_ip = request.headers.get('X-Real-IP')"
log "    else:"
log "        client_ip = request.remote_addr"
log "    return client_ip"
log "=================================================================="