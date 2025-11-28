document.getElementById("addButton").onclick = function () {
    const text = document.getElementById("listInput").value.trim();
    if (text !== "") {
        const li = document.createElement("li");
        li.textContent = text;
        document.getElementById("listOutput").appendChild(li);
    }
};

document.getElementById("clearButton").onclick = function () {
    document.getElementById("listOutput").innerHTML = "";
};
