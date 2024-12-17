import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import resourcesData from './data/resources.resources.json';

const TAX_RATE = 0.02; // 2%

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


    useEffect(() => {
        localStorage.setItem('transactions', JSON.stringify(transactions));
    }, [transactions]);

    const handleSearch = (e) => {
        const query = e.target.value;
        setSearchTerm(query);

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

    const addResourceLine = () => {
        if (!resourceName || !quantity) {
            alert("Veuillez renseigner le nom de la ressource et la quantité.");
            return;
        }

        const qty = Number(quantity);
        const buyP = buyPrice ? Number(buyPrice) : 0;
        const sellP = desiredSellPrice ? Number(desiredSellPrice) : 0;

        const newLine = {
            id: Date.now(),
            resourceName: resourceName,
            quantity: qty,
            buyPrice: buyP,
            desiredSellPrice: sellP,
            sellPrice: null,
            date: null,
            profit: null,
            priceHistory: []
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

                    const sellP = tx.desiredSellPrice;
                    const netSell = sellP * (1 - TAX_RATE);
                    const profit = netSell - (tx.buyPrice ?? 0);
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
    };

    const getTotalProfitLoss = () => {
        const total = transactions
            .filter(t => t.profit !== null && t.profit !== undefined)
            .reduce((acc, t) => acc + t.profit, 0);
        return total.toFixed(2);
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

    return (
        <div className="container mx-auto p-4 space-y-4">
            <h1 className="text-2xl font-bold">Suivi Achats/Ventes</h1>


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
                                    key={item._id.$oid}
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


            <div className="border p-4 rounded">
                <p>Profit/Perte Total: {getTotalProfitLoss()}</p>
            </div>

            {/* Tableau des transactions */}
            <div className="border rounded p-4">
                <table className="w-full text-left">
                    <thead className="bg-gray-100">
                    <tr>
                        <th className="p-2">Ressource</th>
                        <th className="p-2">Quantité</th>
                        <th className="p-2">Prix d'achat</th>
                        <th className="p-2">Prix de vente souhaité</th>
                        <th className="p-2">Prix de vente final</th>
                        <th className="p-2">Date vente</th>
                        <th className="p-2">Profit</th>
                        <th className="p-2">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {transactions.map((tx) => {
                        const isSold = tx.sellPrice !== null && tx.sellPrice !== undefined;
                        return (
                            <tr
                                key={tx.id}
                                className="hover:bg-gray-50 cursor-pointer"
                                onClick={() => handleLineClick(tx)}
                            >
                                <td className="p-2">{tx.resourceName}</td>
                                <td className="p-2">{tx.quantity}</td>
                                <td className="p-2">{tx.buyPrice ?? 0}</td>
                                <td className="p-2">{tx.desiredSellPrice ?? '-'}</td>
                                <td className="p-2">{isSold ? tx.sellPrice : '-'}</td>
                                <td className="p-2">{isSold && tx.date ? new Date(tx.date).toLocaleString() : '-'}</td>
                                <td className="p-2">{isSold && tx.profit !== null ? tx.profit.toFixed(2) : '-'}</td>
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
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>


            {selectedTransaction && showChart && combinedData.length > 0 && (
                <div className="border p-4 rounded">
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
                                <Line type="monotone" dataKey="priceFor1" stroke="#228B22" strokeWidth={2} dot={true} connectNulls={true} />
                                <Line type="monotone" dataKey="priceFor10" stroke="#FFD700" strokeWidth={2} dot={true} connectNulls={true} />
                                <Line type="monotone" dataKey="priceFor100" stroke="#FF0000" strokeWidth={2} dot={true} connectNulls={true} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
