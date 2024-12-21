// App.jsx
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import resourcesData from './data/resources.resources.json';

function App() {
    const [transactions, setTransactions] = useState(() => {
        const saved = localStorage.getItem('transactions');
        return saved ? JSON.parse(saved) : [];
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [resourceName, setResourceName] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [buyPrice, setBuyPrice] = useState('');
    const [desiredSellPrice, setDesiredSellPrice] = useState('');

    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [showChart, setShowChart] = useState(false);

    const [filterTerm, setFilterTerm] = useState('');

    const [selectedRows, setSelectedRows] = useState([]);
    const [newPrice, setNewPrice] = useState('');

    const [collapsedGroups, setCollapsedGroups] = useState({});
    const [selectedDateForSummary, setSelectedDateForSummary] = useState(null);

    // États pour le calendrier (navigation mois/année)
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); // 0-11

    // États pour le tri
    const [sortConfigOngoing, setSortConfigOngoing] = useState({ key: null, direction: 'ascending' });
    const [sortConfigSales, setSortConfigSales] = useState({ key: null, direction: 'ascending' });

    useEffect(() => {
        localStorage.setItem('transactions', JSON.stringify(transactions));
    }, [transactions]);

    const parseIntSafe = (val) => {
        const num = Number(val);
        if (isNaN(num)) return 0;
        return Math.round(num);
    };

    const handleSearch = (e) => {
        const query = e.target.value;
        setSearchTerm(query);
        setResourceName(query); // On garde le nom tapé même s'il n'existe pas dans le JSON

        if (query.trim() === '') {
            setSuggestions([]);
            return;
        }

        const filtered = resourcesData
            .filter(item => item.name.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 5);
        setSuggestions(filtered);
    };

    const selectSuggestion = (item) => {
        setResourceName(item.name);
        setSearchTerm(item.name);
        setSuggestions([]);
    };

    const calcInitialTax = (price) => Math.round(price * 0.02);
    const calcUpdateTax = (price) => Math.round(price * 0.01);

    const addResourceLine = () => {
        if (!resourceName || !quantity) {
            alert("Veuillez renseigner le nom de la ressource et la quantité.");
            return;
        }
        const qty = parseIntSafe(quantity);
        const buyP = parseIntSafe(buyPrice);
        const sellP = parseIntSafe(desiredSellPrice);

        const initialTax = calcInitialTax(sellP);

        const newLine = {
            id: Date.now(),
            resourceName: resourceName, // On utilise le nom tapé, qu'il existe ou non dans le JSON
            quantity: qty, // Assurez-vous que c'est un nombre
            buyPrice: buyP,
            desiredSellPrice: sellP,
            sellPrice: null,
            date: null,
            profit: null,
            priceHistory: [],
            taxHistory: [initialTax]
        };

        setTransactions(prev => [...prev, newLine]);
    };

    const confirmSale = (id) => {
        setTransactions(prev => {
            return prev.map(tx => {
                if (tx.id === id) {
                    if (!tx.desiredSellPrice || tx.desiredSellPrice <= 0) {
                        alert("Le prix de vente souhaité n'est pas valide.");
                        return tx;
                    }
                    const sellP = parseIntSafe(tx.desiredSellPrice);
                    const totalTax = tx.taxHistory.reduce((sum, t) => sum + t, 0);
                    const profit = sellP - tx.buyPrice - totalTax;
                    const saleDate = new Date().toISOString();

                    return {
                        ...tx,
                        sellPrice: sellP,
                        profit: profit,
                        date: saleDate,
                        priceHistory: [{ dateTime: saleDate, price: sellP }]
                    };
                }
                return tx;
            });
        });
    };

    const deleteTransaction = (id) => {
        setTransactions(prev => prev.filter(tx => tx.id !== id));
        if (selectedTransaction && selectedTransaction.id === id) {
            setSelectedTransaction(null);
            setShowChart(false);
        }
        setSelectedRows(prev => prev.filter(rowId => rowId !== id));
    };

    const getTotalProfitLoss = () => {
        const total = transactions
            .filter(t => t.profit !== null && t.profit !== undefined)
            .reduce((acc, t) => acc + t.profit, 0);
        return total;
    };

    const getPriceHistoryData = (resourceName) => {
        const soldTransactions = transactions.filter(t => t.resourceName === resourceName && t.sellPrice !== null);

        const dateMap = {};
        soldTransactions.forEach(tx => {
            tx.priceHistory.forEach(entry => {
                const dateKey = entry.dateTime;
                if (!dateMap[dateKey]) {
                    dateMap[dateKey] = { dateTime: dateKey, priceFor1: null, priceFor10: null, priceFor100: null };
                }
                if (tx.quantity === 1) {
                    dateMap[dateKey].priceFor1 = entry.price;
                } else if (tx.quantity === 10) {
                    dateMap[dateKey].priceFor10 = entry.price;
                } else if (tx.quantity === 100) {
                    dateMap[dateKey].priceFor100 = entry.price;
                }
            });
        });

        const combinedData = Object.values(dateMap);
        combinedData.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
        return combinedData;
    };

    const combinedData = selectedTransaction && selectedTransaction.sellPrice
        ? getPriceHistoryData(selectedTransaction.resourceName)
        : [];

    const handleLineClick = (tx) => {
        if (selectedTransaction && selectedTransaction.id === tx.id) {
            setShowChart(!showChart);
        } else {
            setSelectedTransaction(tx);
            setShowChart(true);
        }
    };

    const resetFields = () => {
        setResourceName('');
        setQuantity('1');
        setBuyPrice('');
        setDesiredSellPrice('');
        setSearchTerm('');
    };

    // On utilise filteredTransactions pour le tableau
    const filteredTransactions = transactions.filter(tx =>
        tx.resourceName.toLowerCase().includes(filterTerm.toLowerCase())
    );

    const toggleRowSelection = (id) => {
        setSelectedRows(prev => {
            if (prev.includes(id)) {
                return prev.filter(rowId => rowId !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const canUpdatePrices = () => {
        if (selectedRows.length === 0) return false;
        const selectedTxs = transactions.filter(tx => selectedRows.includes(tx.id));
        const first = selectedTxs[0];
        return selectedTxs.every(tx => tx.resourceName === first.resourceName && tx.quantity === first.quantity);
    };

    const updatePrices = () => {
        const finalPrice = parseIntSafe(newPrice);
        if (!finalPrice || finalPrice <= 0) {
            alert("Veuillez entrer un nouveau prix valide.");
            return;
        }
        if (!canUpdatePrices()) {
            alert("La sélection n'est pas cohérente.");
            return;
        }

        const updatedTax = calcUpdateTax(finalPrice);
        setTransactions(prev => prev.map(tx => {
            if (selectedRows.includes(tx.id)) {
                const newTaxHistory = [...tx.taxHistory, updatedTax];
                return {
                    ...tx,
                    desiredSellPrice: finalPrice,
                    taxHistory: newTaxHistory
                };
            }
            return tx;
        }));

        setSelectedRows([]);
        setNewPrice('');
    };

    const computeTaxDisplay = (tx) => {
        const totalTax = tx.taxHistory.reduce((sum, t) => sum + t, 0);
        return totalTax;
    };

    const ongoingTransactions = filteredTransactions.filter(tx => tx.sellPrice === null);
    const soldTransactions = filteredTransactions.filter(tx => tx.sellPrice !== null);

    const salesByDate = {};
    soldTransactions.forEach(tx => {
        const d = new Date(tx.date);
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateStr = d.toLocaleDateString('fr-FR', options);
        if (!salesByDate[dateStr]) {
            salesByDate[dateStr] = [];
        }
        salesByDate[dateStr].push(tx);
    });

    const dateGroups = Object.keys(salesByDate).sort((a, b) => {
        const dateA = new Date(a);
        const dateB = new Date(b);
        return dateA - dateB;
    });

    const toggleGroup = (dateStr) => {
        setCollapsedGroups(prev => ({
            ...prev,
            [dateStr]: !prev[dateStr]
        }));
    };

    // Pour le calendrier, on utilise toutes les ventes non filtrées
    const allSoldTransactions = transactions.filter(tx => tx.sellPrice !== null);
    const allSalesByDate = {};
    allSoldTransactions.forEach(tx => {
        const d = new Date(tx.date);
        if (tx.date) {
            if (!allSalesByDate[d.toDateString()]) {
                allSalesByDate[d.toDateString()] = [];
            }
            allSalesByDate[d.toDateString()].push(tx);
        }
    });

    const handlePrevMonth = () => {
        let year = currentYear;
        let month = currentMonth - 1;
        if (month < 0) {
            month = 11;
            year--;
        }
        setCurrentMonth(month);
        setCurrentYear(year);
    };

    const handleNextMonth = () => {
        let year = currentYear;
        let month = currentMonth + 1;
        if (month > 11) {
            month = 0;
            year++;
        }
        setCurrentMonth(month);
        setCurrentYear(year);
    };

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const firstDayWeekday = firstDayOfMonth.getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const weekdayShift = (day) => (day === 0 ? 7 : day);
    const startWeekday = weekdayShift(firstDayWeekday);

    let calendar = [];
    let week = [];
    let dayCounter = 0;

    for (let i = 1; i < startWeekday; i++) {
        week.push(null);
        dayCounter++;
    }

    for (let d = 1; d <= daysInMonth; d++) {
        week.push(d);
        dayCounter++;
        if (dayCounter === 7) {
            calendar.push(week);
            week = [];
            dayCounter = 0;
        }
    }
    if (week.length > 0) {
        while (week.length < 7) {
            week.push(null);
        }
        calendar.push(week);
    }

    const handleCalendarDateClick = (day) => {
        if (!day) return;
        const clickedDate = new Date(currentYear, currentMonth, day);
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateStr = clickedDate.toLocaleDateString('fr-FR', options);
        setSelectedDateForSummary(dateStr);
    };

    let daySales = [];
    let dayProfit = 0;
    if (selectedDateForSummary && salesByDate[selectedDateForSummary]) {
        daySales = salesByDate[selectedDateForSummary];
        dayProfit = daySales.reduce((sum, tx) => sum + (tx.profit ?? 0), 0);
    }

    const daysWithSales = new Set();
    for (let key in allSalesByDate) {
        const d = new Date(key);
        if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
            daysWithSales.add(d.getDate());
        }
    }

    const monthNames = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    // Fonction de comparaison générique
    const compareValues = (a, b, key, direction) => {
        const dirMultiplier = direction === 'ascending' ? 1 : -1;

        const valA = a[key];
        const valB = b[key];

        // Gérer les valeurs undefined ou null
        if (valA === undefined || valA === null) return 1 * dirMultiplier;
        if (valB === undefined || valB === null) return -1 * dirMultiplier;

        // Comparer les nombres
        if (typeof valA === 'number' && typeof valB === 'number') {
            return (valA - valB) * dirMultiplier;
        }

        // Comparer les chaînes de caractères
        const aStr = valA.toString().toLowerCase();
        const bStr = valB.toString().toLowerCase();

        if (aStr < bStr) return -1 * dirMultiplier;
        if (aStr > bStr) return 1 * dirMultiplier;
        return 0;
    };

    // Fonctions de tri pour les Ventes en Cours
    const sortedOngoingTransactions = React.useMemo(() => {
        let sortable = [...ongoingTransactions];
        if (sortConfigOngoing.key !== null) {
            sortable.sort((a, b) => compareValues(a, b, sortConfigOngoing.key, sortConfigOngoing.direction));
        }
        return sortable;
    }, [ongoingTransactions, sortConfigOngoing]);

    const requestSortOngoing = (key) => {
        let direction = 'ascending';
        if (sortConfigOngoing.key === key && sortConfigOngoing.direction === 'ascending') direction = 'descending';
        setSortConfigOngoing({ key, direction });
    };

    const getSortIndicatorOngoing = (key) => {
        if (sortConfigOngoing.key !== key) return null;
        return sortConfigOngoing.direction === 'ascending' ? '↑' : '↓';
    };

    // Fonctions de tri pour les Ventes par Date
    const sortedSalesByDate = React.useMemo(() => {
        let sorted = {};
        Object.keys(salesByDate).forEach(dateStr => {
            let sortable = [...salesByDate[dateStr]];
            if (sortConfigSales.key !== null) {
                sortable.sort((a, b) => compareValues(a, b, sortConfigSales.key, sortConfigSales.direction));
            }
            sorted[dateStr] = sortable;
        });
        return sorted;
    }, [salesByDate, sortConfigSales]);

    const requestSortSales = (key) => {
        let direction = 'ascending';
        if (sortConfigSales.key === key && sortConfigSales.direction === 'ascending') direction = 'descending';
        setSortConfigSales({ key, direction });
    };

    const getSortIndicatorSales = (key) => {
        if (sortConfigSales.key !== key) return null;
        return sortConfigSales.direction === 'ascending' ? '↑' : '↓';
    };

    return (
        <div className="container mx-auto p-4 space-y-4">
            <h1 className="text-2xl font-bold">Suivi Achats/Ventes</h1>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    {/* Formulaire d'ajout de ressource */}
                    <div className="border p-4 rounded space-y-4">
                        <h2 className="text-lg font-bold">Ajouter une Ressource en Stock</h2>

                        <div className="relative">
                            <input
                                type="text"
                                className="border p-2 w-full rounded"
                                placeholder="Rechercher une ressource"
                                value={searchTerm}
                                onChange={handleSearch}
                            />
                            {suggestions.length > 0 && (
                                <ul className="absolute z-10 bg-white border rounded w-full max-h-40 overflow-y-auto">
                                    {suggestions.map((item) => (
                                        <li
                                            key={item.name} // Utilisation de 'name' comme clé unique
                                            onClick={() => selectSuggestion(item)}
                                            className="p-2 hover:bg-gray-100 cursor-pointer"
                                        >
                                            {item.name}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <select
                            className="border p-2 w-full rounded"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                        >
                            <option value="1">1</option>
                            <option value="10">10</option>
                            <option value="100">100</option>
                        </select>

                        <input
                            type="number"
                            className="border p-2 w-full rounded"
                            placeholder="Prix d'achat total (0 si déjà possédé)"
                            value={buyPrice}
                            onChange={(e) => setBuyPrice(e.target.value)}
                        />

                        <input
                            type="number"
                            className="border p-2 w-full rounded"
                            placeholder="Prix de vente souhaité"
                            value={desiredSellPrice}
                            onChange={(e) => setDesiredSellPrice(e.target.value)}
                        />

                        <div className="flex space-x-2">
                            <button
                                onClick={addResourceLine}
                                className="bg-blue-500 text-white px-4 py-2 rounded"
                            >
                                Ajouter au Stock
                            </button>
                            <button
                                onClick={resetFields}
                                className="bg-gray-300 text-black px-4 py-2 rounded"
                            >
                                Réinitialiser les champs
                            </button>
                        </div>
                    </div>

                    {/* Affichage du profit/perte total */}
                    <div className="border p-4 rounded mt-4">
                        <p>Profit/Perte Total: {getTotalProfitLoss()} Kamas</p>
                    </div>

                    {/* Formulaire de mise à jour des prix */}
                    <div className="border p-4 rounded space-y-2 mt-4">
                        <h2 className="text-lg font-bold">Mise à jour des prix (sélection multiple)</h2>
                        <input
                            type="number"
                            className="border p-2 w-full rounded"
                            placeholder="Nouveau prix"
                            value={newPrice}
                            onChange={(e) => setNewPrice(e.target.value)}
                        />
                        <button
                            onClick={updatePrices}
                            className="bg-yellow-500 text-black px-4 py-2 rounded"
                            disabled={selectedRows.length === 0 || !canUpdatePrices()}
                        >
                            Mettre à jour les prix
                        </button>
                        {selectedRows.length > 0 && !canUpdatePrices() && (
                            <p className="text-red-500 text-sm">
                                Les lignes sélectionnées n'ont pas toutes la même ressource et la même quantité.
                            </p>
                        )}
                    </div>
                </div>

                {/* Calendrier à droite */}
                <div>
                    <div className="border p-4 rounded">
                        <h2 className="text-lg font-bold flex justify-between items-center">
                            <button className="px-2 py-1 border rounded" onClick={handlePrevMonth}>Précédent</button>
                            {monthNames[currentMonth]} {currentYear}
                            <button className="px-2 py-1 border rounded" onClick={handleNextMonth}>Suivant</button>
                        </h2>
                        <div className="grid grid-cols-7 gap-2 text-center mt-2 font-bold">
                            <div>L</div><div>M</div><div>M</div><div>J</div><div>V</div><div>S</div><div>D</div>
                        </div>
                        {calendar.map((week, wIdx) => (
                            <div className="grid grid-cols-7 gap-2 text-center mt-2" key={wIdx}>
                                {week.map((day, dIdx) => {
                                    const hasSales = day && daysWithSales.has(day);
                                    return (
                                        <div
                                            key={dIdx}
                                            className={`p-2 border rounded ${day ? 'cursor-pointer hover:bg-gray-100' : 'text-gray-300'} ${hasSales ? 'bg-green-200' : ''}`}
                                            onClick={() => handleCalendarDateClick(day)}
                                        >
                                            {day ? day : ''}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {selectedDateForSummary && (
                        <div className="border p-4 rounded mt-4">
                            <h3 className="text-lg font-bold">Ventes du {selectedDateForSummary}</h3>
                            {daySales.length > 0 ? (
                                <>
                                    <p>Ventes Totales du jour : {daySales.reduce((sum, tx) => sum + (tx.sellPrice ?? 0), 0)} Kamas</p>
                                    <table className="w-full text-left mt-2">
                                        <thead className="bg-gray-100">
                                        <tr>
                                            <th className="p-2">Quantité</th>
                                            <th className="p-2">Ressource</th>
                                            <th className="p-2">Prix Vendu</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {daySales.map((tx) => (
                                            <tr key={tx.id} className="hover:bg-gray-50">
                                                <td className="p-2">{tx.quantity}</td>
                                                <td className="p-2">{tx.resourceName}</td>
                                                <td className="p-2">{tx.sellPrice} Kamas</td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                    <p className="mt-2">Bénéfices de cette journée : {dayProfit} Kamas</p>
                                </>
                            ) : (
                                <p>Aucune vente ce jour-là</p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Ventes en Cours */}
            <div className="border rounded p-4 mt-4">
                <h3 className="text-lg font-bold mb-2">
                    Ventes en Cours ({ongoingTransactions.length} lot{ongoingTransactions.length > 1 ? 's' : ''})
                </h3>
                <table className="w-full text-left">
                    <thead className="bg-gray-100">
                    <tr>
                        <th className="p-2"></th>
                        <th className="p-2 cursor-pointer" onClick={() => requestSortOngoing('resourceName')}>
                            Ressource {getSortIndicatorOngoing('resourceName')}
                        </th>
                        <th className="p-2 cursor-pointer" onClick={() => requestSortOngoing('quantity')}>
                            Quantité {getSortIndicatorOngoing('quantity')}
                        </th>
                        <th className="p-2">Prix d'achat</th>
                        <th className="p-2">Prix de vente souhaité</th>
                        <th className="p-2">Taxe</th>
                        <th className="p-2">Actions</th>
                        <th className="p-2">
                            Filtre:
                            <input
                                type="text"
                                className="border p-1 rounded ml-2"
                                placeholder="Filtrer..."
                                value={filterTerm}
                                onChange={(e) => setFilterTerm(e.target.value)}
                            />
                        </th>
                    </tr>
                    </thead>
                    <tbody>
                    {sortedOngoingTransactions.map((tx) => {
                        const isSelected = selectedRows.includes(tx.id);
                        const totalTax = computeTaxDisplay(tx);
                        const isSold = tx.sellPrice !== null && tx.sellPrice !== undefined;
                        return (
                            <tr key={tx.id} className="hover:bg-gray-50">
                                <td className="p-2" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleRowSelection(tx.id)}
                                    />
                                </td>
                                <td className="p-2">{tx.resourceName}</td>
                                <td className="p-2">{tx.quantity}</td>
                                <td className="p-2">{tx.buyPrice} Kamas</td>
                                <td className="p-2">{tx.desiredSellPrice} Kamas</td>
                                <td className="p-2">{totalTax} Kamas</td>
                                <td className="p-2 flex space-x-2" onClick={(e) => e.stopPropagation()}>
                                    {!isSold && (
                                        <button
                                            className="bg-green-500 text-white px-2 py-1 rounded"
                                            onClick={() => confirmSale(tx.id)}
                                        >
                                            Confirmer la vente
                                        </button>
                                    )}
                                    <button
                                        className="bg-red-500 text-white px-2 py-1 rounded"
                                        onClick={() => deleteTransaction(tx.id)}
                                    >
                                        Supprimer
                                    </button>
                                </td>
                                <td className="p-2"></td>
                            </tr>
                        );
                    })}
                    {sortedOngoingTransactions.length === 0 && (
                        <tr>
                            <td colSpan={8} className="p-2 text-center text-gray-500">Aucune vente en cours</td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>

            {/* Ventes par Date */}
            {dateGroups.map(dateStr => {
                const groupCollapsed = collapsedGroups[dateStr] || false;
                const groupTransactions = sortedSalesByDate[dateStr];
                return (
                    <div key={dateStr} className="border rounded p-4 mt-4">
                        <div className="flex items-center space-x-2 mb-2">
                            <button
                                onClick={() => toggleGroup(dateStr)}
                                className="px-2 py-1 border rounded"
                            >
                                {groupCollapsed ? '+' : '-'}
                            </button>
                            <h3 className="text-lg font-bold">{dateStr}</h3>
                        </div>
                        {!groupCollapsed && (
                            <table className="w-full text-left">
                                <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-2"></th>
                                    <th className="p-2 cursor-pointer" onClick={() => requestSortSales('resourceName')}>
                                        Ressource {getSortIndicatorSales('resourceName')}
                                    </th>
                                    <th className="p-2 cursor-pointer" onClick={() => requestSortSales('quantity')}>
                                        Quantité {getSortIndicatorSales('quantity')}
                                    </th>
                                    <th className="p-2">Prix d'achat</th>
                                    <th className="p-2">Prix de vente final</th>
                                    <th className="p-2">Date vente</th>
                                    <th className="p-2">Profit</th>
                                    <th className="p-2">Taxe</th>
                                    <th className="p-2">Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {groupTransactions.map(tx => {
                                    const isSelected = selectedRows.includes(tx.id);
                                    const totalTax = computeTaxDisplay(tx);
                                    return (
                                        <tr key={tx.id} className="hover:bg-gray-50" onClick={() => handleLineClick(tx)}>
                                            <td className="p-2" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleRowSelection(tx.id)}
                                                />
                                            </td>
                                            <td className="p-2">{tx.resourceName}</td>
                                            <td className="p-2">{tx.quantity}</td>
                                            <td className="p-2">{tx.buyPrice} Kamas</td>
                                            <td className="p-2">{tx.sellPrice} Kamas</td>
                                            <td className="p-2">{tx.date ? new Date(tx.date).toLocaleString() : '-'}</td>
                                            <td className="p-2">{tx.profit !== null ? tx.profit + ' Kamas' : '-'}</td>
                                            <td className="p-2">{totalTax} Kamas</td>
                                            <td className="p-2 flex space-x-2" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    className="bg-red-500 text-white px-2 py-1 rounded"
                                                    onClick={() => deleteTransaction(tx.id)}
                                                >
                                                    Supprimer
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        )}
                    </div>
                );
            })}

            {/* Graphique de l'historique des prix */}
            {selectedTransaction && showChart && combinedData.length > 0 && (
                <div className="border p-4 rounded mt-4">
                    <h3 className="text-lg font-bold">Historique des prix pour {selectedTransaction.resourceName}</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={combinedData}>
                                <XAxis
                                    dataKey="dateTime"
                                    tickFormatter={(val) => {
                                        const d = new Date(val);
                                        return d.toLocaleString();
                                    }}
                                />
                                <YAxis domain={[0, 'dataMax']} />
                                <Tooltip
                                    labelFormatter={(label) => {
                                        const d = new Date(label);
                                        return `Date: ${d.toLocaleString()}`;
                                    }}
                                    formatter={(value, name) => [`Prix: ${value}`, name]}
                                />
                                <Line type="monotone" dataKey="priceFor1" stroke="#228B22" strokeWidth={2} dot connectNulls />
                                <Line type="monotone" dataKey="priceFor10" stroke="#FFD700" strokeWidth={2} dot connectNulls />
                                <Line type="monotone" dataKey="priceFor100" stroke="#FF0000" strokeWidth={2} dot connectNulls />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
