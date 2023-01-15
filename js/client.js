const loginBtn = document.getElementById('login-btn');
const sendBtn = document.getElementById('send-btn');
const email = document.getElementById('email');
const password = document.getElementById('password');
const loginContainer = document.querySelector('.login');
const regexContainer = document.querySelector('.regex-container');
const reguex = document.getElementById('reguex');

var token, ws;

loginBtn.addEventListener('click', () => {
    if (email.value != '' && password.value != '') {
        login('http://localhost:3000/login', {
            email: email.value,
            password: password.value
        })
        .then(res => {
            token = res.data.token;
            openWsConnection(token);
            checkLogin();
        })
        .catch(() => console.log('Something went wrong'));
    }
});

sendBtn.addEventListener('click', () => {
    sendWsMessage();
});

function sendWsMessage() {
    if (ws && reguex.value != '') {
        ws.send(reguex.value);
    } else {
        console.log('You\'re not login or input is empty');
    }
}

function openWsConnection(token) {
    ws = new WebSocket("ws://localhost:3000/ws?token=" + token);

    // Send a message whenever the WebSocket connection opens.
    ws.onopen = (event) => {
        console.log("WebSocket connection established.");
    }

    ws.onmessage = (event) => {
        console.log("WebSocket message received: ", event.data);
    }

    ws.onerror = (event) => {
        console.log("WebSocket error received: ", event.data);
    }

    ws.onclose = (event) => {
        console.log("WebSocket connection closed.");
    }
}

function checkLogin() {
    if (token != undefined || token != null) {
        loginContainer.style.display = "none";
        regexContainer.style.display = "flex";
    }
}

async function login(url, data) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    return response.json();
}