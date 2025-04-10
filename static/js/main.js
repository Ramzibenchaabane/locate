/**
 * /js/main.js
 * Fonctions générales pour toutes les pages
 */

// Fonction pour enregistrer la géolocalisation de l'utilisateur
function logUserLocation(action = 'visite') {
    // Tenter d'obtenir la géolocalisation précise via l'API Navigator
    if (navigator.geolocation) {
        // Options améliorées pour la géolocalisation
        const options = {
            enableHighAccuracy: true, // Pour une meilleure précision, surtout sur mobile
            timeout: 5000,           // Délai maximum de 5 secondes
            maximumAge: 0            // Ne pas utiliser de cache
        };

        navigator.geolocation.getCurrentPosition(
            // Succès
            function(position) {
                const coords = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                
                // Obtenir plus d'informations de géolocalisation via API tierce
                fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=fr`)
                    .then(response => {
                        if (!response.ok) throw new Error('API non disponible');
                        return response.json();
                    })
                    .then(data => {
                        const geoloc = {
                            city: data.city,
                            region: data.principalSubdivision,
                            country: data.countryName,
                            postal: data.postcode
                        };
                        
                        // Envoyer les données au serveur
                        sendLocationData(coords, geoloc, action);
                    })
                    .catch(error => {
                        console.warn("Erreur API géocodage:", error);
                        // Si l'API tierce échoue, envoyer uniquement les coordonnées
                        sendLocationData(coords, null, action);
                    });
            },
            // Erreur
            function(error) {
                console.log("Erreur de géolocalisation: ", error.code, error.message);
                
                // Messages plus détaillés selon l'erreur
                let errorMsg = "";
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMsg = "Utilisateur a refusé la géolocalisation";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMsg = "Données de localisation indisponibles";
                        break;
                    case error.TIMEOUT:
                        errorMsg = "Délai d'attente dépassé pour l'obtention de la position";
                        break;
                    case error.UNKNOWN_ERROR:
                    default:
                        errorMsg = "Erreur inconnue de géolocalisation";
                        break;
                }
                console.log(errorMsg);
                
                // Essayer de récupérer la géolocalisation approximative via IP
                fallbackGeolocation(action);
            },
            options
        );
    } else {
        // Si la géolocalisation n'est pas supportée
        fallbackGeolocation(action);
    }
}

// Fonction de repli pour obtenir la géolocalisation approximative par IP
function fallbackGeolocation(action) {
    // Tentative avec ipapi.co
    fetch('https://ipapi.co/json/')
        .then(response => {
            if (!response.ok) throw new Error('Première API non disponible');
            return response.json();
        })
        .then(data => {
            const geoloc = {
                city: data.city,
                region: data.region,
                country: data.country_name,
                postal: data.postal
            };
            
            // Envoyer les données au serveur
            sendLocationData(null, geoloc, action);
        })
        .catch(error => {
            console.warn('Première API de géolocalisation a échoué, essai d\'une alternative:', error);
            // Essayer une API alternative
            fetch('https://ipinfo.io/json')
                .then(response => {
                    if (!response.ok) throw new Error('Seconde API non disponible');
                    return response.json();
                })
                .then(data => {
                    const geoloc = {
                        city: data.city,
                        region: data.region,
                        country: data.country,
                        postal: data.postal
                    };
                    sendLocationData(null, geoloc, action);
                })
                .catch(finalError => {
                    console.error('Toutes les API de géolocalisation ont échoué:', finalError);
                    sendLocationData(null, { note: "Aucune géolocalisation disponible" }, `${action}_no_geoloc`);
                });
        });
}

// Fonction pour envoyer les données de localisation au serveur
function sendLocationData(coords, geoloc, action) {
    fetch('/log_location', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            coords: coords,
            geoloc: geoloc,
            action: action
        }),
    })
    .then(response => {
        if (!response.ok) throw new Error('Erreur serveur');
        return response.json();
    })
    .then(data => console.log('Données de localisation enregistrées'))
    .catch(error => console.error('Erreur lors de l\'envoi des données de localisation:', error));
}

// Exécuter au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    // Essayer d'abord d'obtenir la géolocalisation précise via l'API Navigator
    if (navigator.geolocation) {
        const options = {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        };

        navigator.geolocation.getCurrentPosition(
            // Succès
            function(position) {
                const coords = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                
                // Obtenir plus d'informations de géolocalisation via API tierce
                fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=fr`)
                    .then(response => {
                        if (!response.ok) throw new Error('API non disponible');
                        return response.json();
                    })
                    .then(data => {
                        const geoloc = {
                            city: data.city,
                            region: data.principalSubdivision,
                            country: data.countryName,
                            postal: data.postcode
                        };
                        
                        // Envoyer les données au serveur
                        sendLocationData(coords, geoloc, 'visite_avec_gps');
                    })
                    .catch(error => {
                        // Si l'API tierce échoue, envoyer uniquement les coordonnées
                        sendLocationData(coords, null, 'visite_avec_gps_sans_details');
                    });
            },
            // Erreur ou refus - fallback vers IP
            function(error) {
                console.log("Géolocalisation non autorisée à la visite, fallback vers IP:", error.code, error.message);
                fallbackGeolocation('visite_sans_gps');
            },
            options
        );
    } else {
        // Si la géolocalisation n'est pas supportée
        fallbackGeolocation('visite_sans_support_gps');
    }
});