// Simulación del estado de la sesión
let isLoggedIn = false; // Por ahora siempre verdadero para simular
const toggleUserMenuButton = document.getElementById('user-menu-button');
const goToProfileButton = document.getElementById('go-to-profile-button');
const logoutButton = document.getElementById('logout-button');

// Función para alternar el menú dropdown
toggleUserMenuButton.addEventListener('click', function() { // Cambiar la variable isLoggedIn a falso para simular el cierre de sesión  
    const dropdown = document.getElementById('user-dropdown');
    dropdown.classList.toggle('hidden');
});

// Función para cerrar el menú dropdown cuando se hace clic fuera
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('user-dropdown');
    const userButton = document.getElementById('user-menu-button');
    
    if (!dropdown.contains(event.target) && !userButton.contains(event.target)) {
        dropdown.classList.add('hidden');
    }
});

// Función para simular el cierre de sesión
logoutButton.addEventListener('click', function() {
    isLoggedIn = false;
    // Aquí iría la lógica real de cierre de sesión
    console.log('Cerrando sesión...');
    window.location.href = '/views/login.html';
});

// Función para ir al perfil
goToProfileButton.addEventListener('click', function() {
    window.location.href = '/views/profile.html';
});
