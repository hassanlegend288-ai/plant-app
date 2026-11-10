/* =====================================
   PLANTMANAGER - APPLICATION LOGIC
===================================== */

// DATA STORAGE

const STORAGE_KEY = "plantManagerDataV1";

function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved) {
            const data = JSON.parse(saved);

            if (
                Array.isArray(data.plants) &&
                Array.isArray(data.sales)
            ) {
                return {
                    plants: data.plants,
                    sales: data.sales,
                    totalSpent: Number(data.totalSpent) || 0
                };
            }
        }
    } catch (error) {
        console.error("Could not load PlantManager data:", error);
    }

    return {
        plants: [],
        sales: [],
        totalSpent: 0
    };
}

const data = loadData();

let plants = data.plants;
let sales = data.sales;
let totalSpent = data.totalSpent;


// SAVE DATA

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        plants,
        sales,
        totalSpent
    }));
}


// HELPER FUNCTIONS

function money(value) {
    return Number(value).toLocaleString("en-GB", {
        style: "currency",
        currency: "GBP"
    });
}

function grams(value) {
    return Number(value).toLocaleString("en-GB", {
        maximumFractionDigits: 2
    }) + " g";
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function localDate() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${day}/${month}/${year}`;
}


// =====================================
// ADD PLANT
// =====================================

function showPlantForm() {
    document.getElementById("plantForm")
        .classList.remove("hidden");

    document.getElementById("plantName").focus();
}

function hidePlantForm() {
    document.getElementById("plantForm")
        .classList.add("hidden");

    document.getElementById("plantForm").reset();
}

function addPlant(event) {
    event.preventDefault();

    const name = document.getElementById("plantName")
        .value.trim();

    const amount = Number(
        document.getElementById("plantAmount").value
    );

    const cost = Number(
        document.getElementById("plantCost").value
    );

    if (
        !name ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !Number.isFinite(cost) ||
        cost < 0
    ) {
        alert("Please enter a valid plant name, amount and cost.");
        return;
    }

    // Check whether this plant already exists.

    const existingPlant = plants.find(plant =>
        plant.name.toLowerCase() === name.toLowerCase()
    );

    if (existingPlant) {

        // Add new stock to existing plant.

        existingPlant.amount =
            Number(existingPlant.amount) + amount;

        existingPlant.costRemaining =
            Number(existingPlant.costRemaining) + cost;

    } else {

        // Create a new plant.

        plants.push({
            id: Date.now(),
            name: name,
            amount: amount,
            costRemaining: cost
        });

    }

    // Update total money spent.

    totalSpent += cost;

    saveData();
    updateDashboard();

    hidePlantForm();

    alert("Plant successfully added!");
}


// Connect the plant form.

document.getElementById("plantForm")
    .addEventListener("submit", addPlant);


// =====================================
// EDIT PLANT
// =====================================

function editPlant(id) {

    const plant = plants.find(item => item.id === id);

    if (!plant) return;

    const newName = prompt(
        "Enter the plant name:",
        plant.name
    );

    if (newName === null) return;

    if (!newName.trim()) {
        alert("Plant name cannot be empty.");
        return;
    }

    const newAmount = prompt(
        "Enter the remaining amount in grams:",
        plant.amount
    );

    if (newAmount === null) return;

    const amount = Number(newAmount);

    if (!Number.isFinite(amount) || amount < 0) {
        alert("Please enter a valid amount.");
        return;
    }

    const newCost = prompt(
        "Enter the remaining purchase cost (£):",
        plant.costRemaining.toFixed(2)
    );

    if (newCost === null) return;

    const cost = Number(newCost);

    if (!Number.isFinite(cost) || cost < 0) {
        alert("Please enter a valid cost.");
        return;
    }

    plant.name = newName.trim();
    plant.amount = amount;
    plant.costRemaining = cost;

    saveData();
    updateDashboard();
}


// =====================================
// DELETE PLANT
// =====================================

function deletePlant(id) {

    const plant = plants.find(item => item.id === id);

    if (!plant) return;

    const confirmed = confirm(
        `Delete ${plant.name} from your remaining stock?`
    );

    if (!confirmed) return;

    plants = plants.filter(item => item.id !== id);

    saveData();
    updateDashboard();
}


// =====================================
// RECORD A SALE
// =====================================

function recordSale(event) {
    event.preventDefault();

    const plantId = Number(
        document.getElementById("salePlant").value
    );

    const amount = Number(
        document.getElementById("saleAmount").value
    );

    const price = Number(
        document.getElementById("salePrice").value
    );

    const plant = plants.find(item => item.id === plantId);

    if (!plant) {
        alert("Please select a plant.");
        return;
    }

    if (
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !Number.isFinite(price) ||
        price < 0
    ) {
        alert("Please enter a valid amount and selling price.");
        return;
    }

    if (amount > Number(plant.amount)) {
        alert(
            `You only have ${grams(plant.amount)} of ${plant.name} remaining.`
        );
        return;
    }

    // Calculate the purchase cost of the amount sold.

    const costPerGram =
        plant.costRemaining / plant.amount;

    const costOfSale = costPerGram * amount;

    // Calculate profit from this sale.

    const profit = price - costOfSale;

    // Deduct sold grams from stock.

    plant.amount -= amount;

    plant.costRemaining -= costOfSale;

    // Avoid tiny floating point leftovers.

    plant.amount = Math.max(0, plant.amount);
    plant.costRemaining = Math.max(0, plant.costRemaining);

    // Save the sale record.

    sales.push({
        id: Date.now(),
        plantName: plant.name,
        plantId: plant.id,
        amount: amount,
        price: price,
        costBasis: costOfSale,
        profit: profit,
        date: localDate()
    });

    saveData();
    updateDashboard();

    document.getElementById("saleForm").reset();

    alert(
        `Sale recorded successfully!\n\n` +
        `Sale: ${money(price)}\n` +
        `Profit: ${money(profit)}`
    );
}


// Connect the sale form.

document.getElementById("saleForm")
    .addEventListener("submit", recordSale);


// =====================================
// DELETE SALE RECORD
// =====================================

function deleteSale(id) {

    const sale = sales.find(item => item.id === id);

    if (!sale) return;

    const confirmed = confirm(
        "Delete this sale record? This will not automatically restore the stock."
    );

    if (!confirmed) return;

    sales = sales.filter(item => item.id !== id);

    saveData();
    updateDashboard();
}


// =====================================
// SEARCH PLANTS
// =====================================

document.getElementById("searchPlants")
    .addEventListener("input", displayPlants);


// =====================================
// DISPLAY PLANTS
// =====================================

function displayPlants() {

    const list = document.getElementById("plantList");

    const search = document.getElementById("searchPlants")
        .value.trim().toLowerCase();

    const filteredPlants = plants.filter(plant =>
        plant.name.toLowerCase().includes(search)
    );

    if (filteredPlants.length === 0) {

        list.innerHTML = `
            <tr>
                <td colspan="4">
                    No plants found.
                </td>
            </tr>
        `;

        return;
    }

    list.innerHTML = filteredPlants.map(plant => `

        <tr>

            <td>
                🌿 ${escapeHTML(plant.name)}
            </td>

            <td>
                ${grams(plant.amount)}
            </td>

            <td>
                ${money(plant.costRemaining)}
            </td>

            <td class="actions">

                <button
                    class="edit-button"
                    onclick="editPlant(${plant.id})"
                    title="Edit plant"
                >
                    ✎
                </button>

                <button
                    class="delete-button"
                    onclick="deletePlant(${plant.id})"
                    title="Delete plant"
                >
                    🗑
                </button>

            </td>

        </tr>

    `).join("");
}


// =====================================
// PLANT SELECTION FOR SALES
// =====================================

function updatePlantOptions() {

    const select = document.getElementById("salePlant");

    const currentValue = select.value;

    const availablePlants = plants.filter(
        plant => Number(plant.amount) > 0
    );

    select.innerHTML = `
        <option value="">Select a plant</option>

        ${availablePlants.map(plant => `
            <option value="${plant.id}">
                ${escapeHTML(plant.name)}
                (${grams(plant.amount)} available)
            </option>
        `).join("")}
    `;

    // Keep the existing selection where possible.

    if (availablePlants.some(
        plant => String(plant.id) === currentValue
    )) {
        select.value = currentValue;
    }
}


// =====================================
// STOCK REMAINING
// =====================================

function displayStock() {

    const list = document.getElementById("stockList");

    const stockTotal = plants.reduce(
        (total, plant) => total + Number(plant.amount),
        0
    );

    document.getElementById("stockTotal").textContent =
        grams(stockTotal);

    if (plants.length === 0) {

        list.innerHTML = `
            <p class="empty-message">
                No stock available yet.
            </p>
        `;

        return;
    }

    list.innerHTML = plants.map(plant => `

        <div class="stock-item ${
            Number(plant.amount) <= 50 ? "low-stock" : ""
        }">

            <span>
                🌿 ${escapeHTML(plant.name)}
            </span>

            <strong>
                ${grams(plant.amount)}
            </strong>

        </div>

    `).join("");
}


// =====================================
// DISPLAY SALES RECORDS
// =====================================

function displaySales() {

    const list = document.getElementById("salesList");

    if (sales.length === 0) {

        list.innerHTML = `
            <tr>
                <td colspan="5">
                    No sales recorded yet.
                </td>
            </tr>
        `;

        return;
    }

    list.innerHTML = [...sales].reverse().map(sale => `

        <tr>

            <td>${escapeHTML(sale.date)}</td>

            <td>${escapeHTML(sale.plantName)}</td>

            <td>${grams(sale.amount)}</td>

            <td>${money(sale.price)}</td>

            <td>
                <button
                    class="delete-button"
                    onclick="deleteSale(${sale.id})"
                    title="Delete sale"
                >
                    🗑
                </button>
            </td>

        </tr>

    `).join("");
}


// =====================================
// UPDATE DASHBOARD TOTALS
// =====================================

function updateDashboard() {

    // Total grams remaining.

    const remaining = plants.reduce(
        (total, plant) => total + Number(plant.amount),
        0
    );

    // Total sales revenue.

    const revenue = sales.reduce(
        (total, sale) => total + Number(sale.price),
        0
    );

    // Realised profit from completed sales.

    const profit = sales.reduce(
        (total, sale) => total + Number(sale.profit),
        0
    );

    // Update dashboard.

    document.getElementById("totalPlants").textContent =
        grams(remaining);

    document.getElementById("totalSpent").textContent =
        money(totalSpent);

    document.getElementById("totalSales").textContent =
        money(revenue);

    document.getElementById("totalProfit").textContent =
        money(profit);

    // Refresh all sections.

    displayPlants();
    displayStock();
    displaySales();
    updatePlantOptions();
}


// =====================================
// START APPLICATION
// =====================================

updateDashboard();

console.log("🌿 weedManager is running!");