// Initialize Lucide Icons
lucide.createIcons();

// Role Selection Toggle
const roleHomeowner = document.getElementById('roleHomeowner');
const roleContractor = document.getElementById('roleContractor');

roleHomeowner.addEventListener('click', () => {
  roleHomeowner.classList.add('active');
  roleContractor.classList.remove('active');
});

roleContractor.addEventListener('click', () => {
  roleContractor.classList.add('active');
  roleHomeowner.classList.remove('active');
});

// Password Toggle Functionality
function setupPasswordToggle(toggleId, inputId) {
  const toggleBtn = document.getElementById(toggleId);
  const passwordInput = document.getElementById(inputId);

  toggleBtn.addEventListener('click', () => {
    const isPassword = passwordInput.getAttribute('type') === 'password';
    passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
    
    // Toggle Icon
    toggleBtn.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
    lucide.createIcons();
  });
}

setupPasswordToggle('togglePassword', 'password');
setupPasswordToggle('toggleConfirmPassword', 'confirmPassword');

// Form Validation on Submit
document.getElementById('signupForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (password !== confirmPassword) {
    alert("Passwords do not match!");
    return;
  }

  alert("Account created successfully!");
});