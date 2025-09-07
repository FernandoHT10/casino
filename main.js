let currentUser = null;

// Login
document.getElementById("loginBtn").addEventListener("click", () => {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const users = JSON.parse(localStorage.getItem("users")) || {};
    if(users[username] && users[username].password === password){
        currentUser = username;
        localStorage.setItem("currentUser", currentUser);
        showMenu();
    } else { showMessage("Usuario o contraseña incorrectos"); }
});

// Register
document.getElementById("registerBtn").addEventListener("click", () => {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    if(!username || !password) { showMessage("Completa todos los campos"); return; }

    const users = JSON.parse(localStorage.getItem("users")) || {};
    if(users[username]){ showMessage("Usuario ya existe"); return; }
    users[username] = {password: password, saldo: 9000};
    localStorage.setItem("users", JSON.stringify(users));
    showMessage("Usuario registrado! Ahora haz login");
});

function showMessage(msg){ document.getElementById("message").innerText = msg; }

function showMenu(){
    document.getElementById("login-register").style.display = "none";
    document.getElementById("menu").style.display = "block";
    document.getElementById("displayUser").innerText = currentUser;
    updateSaldo();
}

document.getElementById("logoutBtn").addEventListener("click", () => {
    currentUser = null;
    localStorage.removeItem("currentUser");
    document.getElementById("menu").style.display = "none";
    document.getElementById("login-register").style.display = "block";
});

function updateSaldo(){
    const users = JSON.parse(localStorage.getItem("users")) || {};
    if(currentUser && users[currentUser]){
        document.getElementById("displaySaldo").innerText = users[currentUser].saldo;
    }
}

window.onload = () => {
    const storedUser = localStorage.getItem("currentUser");
    if(storedUser){
        currentUser = storedUser;
        showMenu();
    }
}
