let currentSection = "login";

let users = JSON.parse(localStorage.getItem("users")) || [];

let adminExists = users.some(user => user.username === "admin");

if (!adminExists) {
    users.push({
        name: "Administrator",
        username: "admin",
        password: "123",
        role: "admin"
    });

    localStorage.setItem("users", JSON.stringify(users));
}

function showLogin() {
    currentSection = "login";

    document.getElementById("login").style.display = "block";
    document.getElementById("register").style.display = "none";
}

function showRegister() {
    currentSection = "register";

    document.getElementById("login").style.display = "none";
    document.getElementById("register").style.display = "block";
}

function submitForm() {

    let users = JSON.parse(localStorage.getItem("users")) || [];

    if (currentSection === "login") {

        let username = document.getElementById("loginUsername").value.trim();
        let password = document.getElementById("loginPassword").value;

        let user = users.find(u =>
            u.username.toLowerCase() === username.toLowerCase() &&
            u.password === password
        );

        if (user) {
            sessionStorage.setItem("loggedInUser", user.username);
            sessionStorage.setItem("userRole", user.role || "user");

            window.location.href = "main.html";
        }
        else {
            alert("Incorrect username or password.");
        }
    }

    else if (currentSection === "register") {

        let name = document.getElementById("registerName").value.trim();
        let username = document.getElementById("registerUsername").value.trim();
        let password = document.getElementById("registerPassword").value;

        if (name === "" || username === "" || password === "") {
            alert("Please fill in all fields.");
            return;
        }

        let existingUser = users.find(u =>
            u.username.toLowerCase() === username.toLowerCase()
        );

        if (existingUser) {
            alert("That username is already taken!");
            return;
        }

        let newUser = {
            name: name,
            username: username,
            password: password,
            role: "user"
        };

        users.push(newUser);

        localStorage.setItem("users", JSON.stringify(users));

        sessionStorage.setItem("loggedInUser", username);
        sessionStorage.setItem("userRole", "user");

        window.location.href = "main.html";
    }
}

showLogin();

function logout() {
    sessionStorage.removeItem("loggedInUser");
    sessionStorage.removeItem("userRole");

    window.location.href = "index.html";
}
