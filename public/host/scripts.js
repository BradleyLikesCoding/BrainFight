socket = io(window.location.hostname + ':3000');

socket.emit("host", {}, (response) => {
    const pin = response.pin;
    document.getElementById("HostCode").textContent = `Game Code: ${pin}`;
});