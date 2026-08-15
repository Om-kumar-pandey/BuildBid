document.addEventListener('DOMContentLoaded', () => {
  // Role Toggle Logic
  const roleButtons = document.querySelectorAll('.role-btn');
  let selectedRole = 'customer';

  roleButtons.forEach(button => {
    button.addEventListener('click', () => {
      roleButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      selectedRole = button.getAttribute('data-role');
    });
  });

  // Password Visibility Toggle
  const togglePassword = document.querySelector('#togglePassword');
  const passwordInput = document.querySelector('#password');

  togglePassword.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    
    // Toggle Icon Class
    togglePassword.classList.toggle('fa-eye');
    togglePassword.classList.toggle('fa-eye-slash');
  });

  // Form Submission Handling
  const loginForm = document.querySelector('#loginForm');

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const email = document.querySelector('#email').value;
    const password = passwordInput.value;
    const rememberMe = document.querySelector('#rememberMe').checked;

    console.log('Login Details:', {
      role: selectedRole,
      email: email,
      password: password,
      rememberMe: rememberMe
    });

    alert(`Logging in as ${selectedRole === 'customer' ? 'Customer/Homeowner' : 'Contractor/Professional'}`);
  });
});