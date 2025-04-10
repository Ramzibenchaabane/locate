/**
 * /js/main.js
 * Fonctions générales pour toutes les pages
 */

// Fonction pour enregistrer la géolocalisation de l'utilisateur
function logUserLocation(action = 'visite') {
    // Tenter d'obtenir la géolocalisation précise via l'API Navigator
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            // Succès
            function(position) {
                const coords = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                
                // Obtenir plus d'informations de géolocalisation via API tierce
                fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=fr`)
                    .then(response => response.json())
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
                        // Si l'API tierce échoue, envoyer uniquement les coordonnées
                        sendLocationData(coords, null, action);
                    });
            },
            // Erreur
            function(error) {
                console.log("Erreur de géolocalisation: ", error);
                // Essayer de récupérer la géolocalisation approximative via IP
                fallbackGeolocation(action);
            }
        );
    } else {
        // Si la géolocalisation n'est pas supportée
        fallbackGeolocation(action);
    }
}

// Fonction de repli pour obtenir la géolocalisation approximative par IP
function fallbackGeolocation(action) {
    fetch('https://ipapi.co/json/')
        .then(response => response.json())
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
        .catch(error => console.error('Erreur lors de la récupération de la géolocalisation par IP:', error));
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
    .then(response => response.json())
    .then(data => console.log('Données de localisation enregistrées'))
    .catch(error => console.error('Erreur lors de l\'envoi des données de localisation:', error));
}

// Exécuter au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    // Essayer d'abord d'obtenir la géolocalisation précise via l'API Navigator
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            // Succès
            function(position) {
                const coords = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                
                // Obtenir plus d'informations de géolocalisation via API tierce
                fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=fr`)
                    .then(response => response.json())
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
                console.log("Géolocalisation non autorisée à la visite, fallback vers IP:", error);
                fallbackGeolocation('visite_sans_gps');
            }
        );
    } else {
        // Si la géolocalisation n'est pas supportée
        fallbackGeolocation('visite_sans_support_gps');
    }
});