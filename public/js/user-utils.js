// Simulación del estado de la sesión
let isLoggedIn = false; // Por ahora siempre verdadero para simular
const toggleUserMenuButton = document.getElementById('user-menu-button');
const goToProfileButton = document.getElementById('go-to-profile-button');
const goToSettingsButton = document.getElementById('go-to-settings-button');
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

// Función para cerrar sesión con Firebase Auth
logoutButton.addEventListener('click', async function() {
    try {
        // Obtener la instancia de auth desde Firebase
        const auth = firebase.auth();
        await auth.signOut();
        
        // Limpiar datos locales
        localStorage.clear();
        
        // Redirigir al login
        window.location.href = '/views/login.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        alert('Error al cerrar sesión: ' + error.message);
    }
});

// Función para ir al perfil
goToProfileButton.addEventListener('click', function() {
    window.location.href = '/views/profile.html';
});

goToSettingsButton.addEventListener('click', function() {
    window.location.href = '/views/settings.html';
})
