const COLORS = { Intrattenimento: '#f43f5e', Produttivita: '#38bdf8', Utility: '#f59e0b', Salute: '#10b981', Altro: '#64748b' };

document.addEventListener("DOMContentLoaded", renderEngine);

function engineAddSubscription() {
    const name = document.getElementById("subName").value.trim();
    const cost = document.getElementById("subCost").value;
    const cycle = parseInt(document.getElementById("subCycle").value);
    const category = document.getElementById("subCat").value;
    const date = document.getElementById("subDate").value;

    if (!name || !cost || !date) { return alert("Validazione fallita: Compilare tutti i campi."); }

    const dataset = { id: 'SUB-' + Date.now(), name, cost: parseFloat(cost), cycle, category, date };
    let db = JSON.parse(localStorage.getItem("subsaver_pro_db")) || [];
    db.push(dataset);
    localStorage.setItem("subsaver_pro_db", JSON.stringify(db));

    document.getElementById("subName").value = '';
    document.getElementById("subCost").value = '';
    document.getElementById("subDate").value = '';
    
    renderEngine();
}

function calculateFinancials(db) {
    let costDay = 0, costWeek = 0, costMonth = 0, costYear = 0;
    let catWeights = { Intrattenimento: 0, Produttivita: 0, Utility: 0, Salute: 0, Altro: 0 };

    db.forEach(item => {
        const dailyEquivalent = item.cost / item.cycle;
        const weeklyEquivalent = dailyEquivalent * 7;
        const monthlyEquivalent = dailyEquivalent * 30.4375;
        const yearlyEquivalent = dailyEquivalent * 365;

        costDay += dailyEquivalent;
        costWeek += weeklyEquivalent;
        costMonth += monthlyEquivalent;
        costYear += yearlyEquivalent;
        
        catWeights[item.category] += monthlyEquivalent;
    });

    document.getElementById("statDay").innerText = `€${costDay.toFixed(2)}`;
    document.getElementById("statWeek").innerText = `€${costWeek.toFixed(2)}`;
    document.getElementById("statMonth").innerText = `€${costMonth.toFixed(2)}`;
    document.getElementById("statYear").innerText = `€${costYear.toFixed(2)}`;

    const chartBar = document.getElementById("chartBar");
    chartBar.innerHTML = '';
    if (costMonth > 0) {
        for (let cat in catWeights) {
            const pct = (catWeights[cat] / costMonth) * 100;
            if (pct > 0) {
                const seg = document.createElement("div");
                seg.className = "bar-segment";
                seg.style.width = `${pct}%`;
                seg.style.backgroundColor = COLORS[cat];
                seg.title = `${cat}: ${pct.toFixed(1)}%`;
                chartBar.appendChild(seg);
            }
        }
    }
}

function renderEngine() {
    let db = JSON.parse(localStorage.getItem("subsaver_pro_db")) || [];
    calculateFinancials(db);

    const query = document.getElementById("searchQuery").value.toLowerCase();
    const catFilter = document.getElementById("filterCat").value;
    const sortOrder = document.getElementById("sortBy").value;
    const container = document.getElementById("masterSubContainer");
    
    container.innerHTML = "";

    let processedData = db.filter(item => {
        const matchesQuery = item.name.toLowerCase().includes(query);
        const matchesCat = (catFilter === "ALL" || item.category === catFilter);
        return matchesQuery && matchesCat;
    });

    processedData.sort((a, b) => {
        if (sortOrder === "price-desc") return b.cost - a.cost;
        if (sortOrder === "price-asc") return a.cost - b.cost;
        if (sortOrder === "date-asc") return new Date(a.date) - new Date(b.date);
    });

    if (processedData.length === 0) {
        container.innerHTML = `<p style="color:var(--text-muted); font-size:13px; text-align:center; padding: 20px 0;">Nessun abbonamento attivo trovato nel database.</p>`;
        return;
    }

    processedData.forEach(item => {
        const itemBox = document.createElement("div");
        itemBox.className = "sub-item";
        itemBox.innerHTML = `
            <div>
                <div class="sub-item-title">${escapeXSS(item.name)}</div>
                <div class="sub-item-date">Prossimo addebito: ${item.date}</div>
                <span class="cat-badge" style="background:rgba(255,255,255,0.03); color:${COLORS[item.category]}">${item.category}</span>
            </div>
            <div class="action-area">
                <div>
                    <div class="price-tag">€${item.cost.toFixed(2)}</div>
                    <div class="cycle-tag">${convertCycleText(item.cycle)}</div>
                </div>
                <button class="btn-del" onclick="engineDeleteRecord('${item.id}')">Elimina</button>
            </div>
        `;
        container.appendChild(itemBox);
    });
}

function engineDeleteRecord(id) {
    let db = JSON.parse(localStorage.getItem("subsaver_pro_db")) || [];
    db = db.filter(item => item.id !== id);
    localStorage.setItem("subsaver_pro_db", JSON.stringify(db));
    renderEngine();
}

function convertCycleText(days) {
    if (days === 7) return "al mese (Settimanale)";
    if (days === 30) return "ogni mese";
    if (days === 60) return "ogni 2 mesi";
    if (days === 182) return "ogni 6 mesi";
    if (days === 365) return "all'anno";
    return `Ogni ${days} Giorni`;
}

function exportDatabase() {
    const db = localStorage.getItem("subsaver_pro_db") || "[]";
    const blob = new Blob([db], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subsaver_backup_${Date.now()}.json`;
    a.click();
}

function importDatabase(event) {
    const file = event.target.files;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            if (Array.isArray(parsed)) {
                localStorage.setItem("subsaver_pro_db", JSON.stringify(parsed));
                renderEngine();
                alert("Database locale sovrascritto e ripristinato.");
            } else { alert("Struttura file JSON non compatibile."); }
        } catch (err) { alert("Errore critico di lettura dati."); }
    };
    reader.readAsText(file);
}

function escapeXSS(str) {
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}
