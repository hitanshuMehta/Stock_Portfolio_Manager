import React, { useState } from "react";
import {
  FiEdit2,
  FiTrash2,
  FiTrendingUp,
  FiTrendingDown,
  FiChevronUp,
  FiChevronDown,
} from "react-icons/fi";
import { format } from "date-fns";

const StockTable = ({ stocks, onEdit, onDelete }) => {
  const [sortField, setSortField] = useState("symbol");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedStocks = [...stocks].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    if (sortField === "purchaseDate") {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    if (aValue === undefined || aValue === null) aValue = 0;
    if (bValue === undefined || bValue === null) bValue = 0;

    if (typeof aValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const paginatedStocks = sortedStocks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(stocks.length / itemsPerPage);

  const SortIcon = ({ field }) => {
    if (sortField !== field)
      return <FiChevronUp className="w-4 h-4 opacity-0" />;
    return sortDirection === "asc" ? (
      <FiChevronUp className="w-4 h-4 text-blue-500" />
    ) : (
      <FiChevronDown className="w-4 h-4 text-blue-500" />
    );
  };

  const formatCurrency = (value) => {
    if (value === undefined || value === null) return "-";
    const formatted = value.toLocaleString("en-IN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
    return `₹${formatted}`;
  };

  const formatPercentageAndCAGR = (profitLoss, purchaseAmount, daysHeld) => {
    if (!profitLoss || !purchaseAmount) return { ar: "", cagr: "" };

    const absoluteReturn = (profitLoss / purchaseAmount) * 100;
    const arText = `AR (${
      absoluteReturn >= 0 ? "+" : ""
    }${absoluteReturn.toFixed(2)}%)`;

    if (!daysHeld || daysHeld <= 0) {
      return { ar: arText, cagr: "" };
    }

    const finalValue = purchaseAmount + profitLoss;
    const initialValue = purchaseAmount;
    const T = daysHeld / 365.25;

    if (T <= 0 || initialValue <= 0 || finalValue <= 0) {
      return { ar: arText, cagr: "" };
    }

    const cagr = (Math.pow(finalValue / initialValue, 1 / T) - 1) * 100;
    const cagrText = `CAGR (${cagr >= 0 ? "+" : ""}${cagr.toFixed(2)}%)`;

    return { ar: arText, cagr: cagrText };
  };

  const calculatePricePerStock = (purchaseAmount, quantity) => {
    if (!purchaseAmount || !quantity || quantity === 0) return null;
    return purchaseAmount / quantity;
  };

  return (
    <div className="overflow-hidden">
      {/* Mobile Cards View */}
      <div className="block md:hidden">
        <div className="space-y-4 p-4">
          {paginatedStocks.map((stock) => (
            <div
              key={stock._id}
              className="bg-gray-50 rounded-lg p-4 space-y-3 shadow-md" 
            >
              {/* Header and Actions */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {stock.symbol}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {stock.shortName || stock.fullName}
                  </p>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => onEdit(stock)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <FiEdit2 size={14} />
                  </button>
                  <button
                    onClick={() => onDelete(stock._id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Main Data Grid (Updated for alignment) */}
              <div className="grid grid-cols-2 gap-3 text-sm border-t border-gray-200 pt-3">
                
                {/* 1. Quantity (LEFT) */}
                <div className="flex flex-col">
                  <span className="text-gray-500">Quantity</span>
                  <span className="font-medium text-gray-900">
                    {stock.quantity}
                  </span>
                </div>

                {/* 2. Total Invested (RIGHT) */}
                <div className="flex flex-col items-end text-right">
                  <span className="text-gray-500">Total Invested</span>
                  <div className="font-medium text-gray-900">
                      {formatCurrency(stock.purchaseAmount)}
                      {calculatePricePerStock(stock.purchaseAmount, stock.quantity) && (
                          <div className="text-xs text-gray-600">
                              (₹{calculatePricePerStock(stock.purchaseAmount, stock.quantity).toFixed(2)} per price)
                          </div>
                      )}
                  </div>
                </div>
                
                {/* 3. Purchase Date (LEFT) */}
                <div className="flex flex-col">
                  <span className="text-gray-500">Purchase Date</span>
                  <span className="font-medium text-gray-900">
                    {format(new Date(stock.purchaseDate), "dd-MMM-yyyy")}
                  </span>
                </div>

                {/* 4. Current Value (RIGHT) */}
                <div className="flex flex-col items-end text-right">
                  <span className="text-gray-500">Current Value</span>
                  <div className="font-medium text-gray-900">
                      {formatCurrency(stock.cmpAmount)}
                      {stock.cmpRate && (
                          <div className="text-xs text-gray-600">
                              (₹{stock.cmpRate.toFixed(2)} per price)
                          </div>
                      )}
                  </div>
                </div>
                
              </div>

              {/* P&L Details (Combined and Aligned) */}
              <div className="col-span-2 flex flex-col pt-2 border-t border-gray-200">
                <span className="text-gray-500">P&L Details</span>
                <div className="flex justify-between items-start">
                    {/* P&L Amount (LEFT) */}
                    <div
                        className={`font-bold text-lg ${
                        (stock.profitLoss || 0) >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                    >
                        {stock.profitLoss ? (
                        <>
                            {stock.profitLoss >= 0 ? "+" : ""}
                            {formatCurrency(stock.profitLoss)}
                        </>
                        ) : (
                        "-"
                        )}
                    </div>
                    {/* AR/CAGR (RIGHT) */}
                    {stock.profitLoss !== undefined && (
                        <div
                            className={`text-sm text-right ${
                            (stock.profitLoss || 0) >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                        >
                            {(() => {
                                const percentages = formatPercentageAndCAGR(
                                    stock.profitLoss,
                                    stock.purchaseAmount,
                                    stock.daysHeld
                                );
                                return (
                                    <div className="space-y-0.5 font-semibold">
                                        {percentages.ar && <div>{percentages.ar}</div>}
                                        {percentages.cagr && <div>{percentages.cagr}</div>}
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>
              </div>

              {/* Tax Details (UPDATED: Added Days Held) */}
              {stock.taxSlab && (
                <div className="flex justify-between text-xs text-gray-500 border-t border-gray-200 pt-3">
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-600">Tax Status</span>
                    <span
                      className={`inline-flex mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                        stock.taxSlab === "Long Term"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {stock.taxSlab}
                    </span>
                    {/* ADDED: Days Held */}
                    <span className="mt-1 text-gray-600 font-medium">
                        {stock.daysHeld ? `(${stock.daysHeld} Days Held)` : ''}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-semibold text-gray-600">Tax Amount</span>
                    <span className="mt-1 text-gray-900 font-medium">
                      {formatCurrency(stock.taxAmount)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Desktop Table View (No functional changes) */}
      <div className="hidden md:block">
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {/* Fixed Symbol Column */}
                <th
                  scope="col"
                  className="sticky left-0 z-20 bg-gray-50 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                  onClick={() => handleSort("symbol")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Symbol</span>
                    <SortIcon field="symbol" />
                  </div>
                </th>

                {/* Scrollable Columns */}
                {[
                  { key: "fullName", label: "Company" },
                  { key: "purchaseDate", label: "Purchased Date" },
                  { key: "quantity", label: "Qty" },
                  { key: "purchaseAmount", label: "Total Purchased Amount" },
                  { key: "cmpRate", label: "CMP Rate(Per Share)" },
                  { key: "cmpAmount", label: "CMP Amount" },
                  { key: "profitLoss", label: "P&L" },
                  { key: "daysHeld", label: "Days" },
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort(key)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{label}</span>
                      <SortIcon field={key} />
                    </div>
                  </th>
                ))}
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tax Slab
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tax Amount
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedStocks.map((stock, idx) => (
                <tr
                  key={stock._id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {/* Fixed Symbol Cell */}
                  <td className="sticky left-0 z-10 bg-white px-3 py-4 whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {stock.symbol}
                      </div>
                      {stock.shortName && (
                        <div className="text-sm text-gray-500">
                          {stock.shortName}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Scrollable Cells */}
                  <td className="px-3 py-4 max-w-[200px] text-wrap">
                    <div
                      className="text-sm text-gray-900"
                      title={stock.fullName}
                    >
                      {stock.fullName}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {stock.ineIsin}
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(stock.purchaseDate), "dd-MMM-yyyy")}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                    {stock.quantity.toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm">
                    {(() => {
                      const pricePerStock = calculatePricePerStock(
                        stock.purchaseAmount,
                        stock.quantity
                      );
                      return (
                        <div>
                          <div className="text-gray-900">
                            {formatCurrency(stock.purchaseAmount)}
                          </div>

                          {pricePerStock && (
                            <div className="text-xs text-gray-600">
                              ₹{pricePerStock.toFixed(2)} per share
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm">
                    {stock.cmpRate ? (
                      <div>
                        <div className="text-gray-900">
                          ₹{stock.cmpRate.toFixed(2)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(stock.cmpAmount)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    {stock.profitLoss !== undefined ? (
                      <div
                        className={`text-sm font-medium ${
                          stock.profitLoss >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        <div className="flex items-center space-x-1">
                          {stock.profitLoss >= 0 ? (
                            <FiTrendingUp className="w-3 h-3" />
                          ) : (
                            <FiTrendingDown className="w-3 h-3" />
                          )}
                          <span>
                            {stock.profitLoss >= 0 ? "+" : ""}
                            {formatCurrency(stock.profitLoss)}
                          </span>
                        </div>
                        <div className="text-xs mt-0.5">
                          {(() => {
                            const percentages = formatPercentageAndCAGR(
                              stock.profitLoss,
                              stock.purchaseAmount,
                              stock.daysHeld
                            );
                            return (
                              <>
                                {percentages.ar && <div>{percentages.ar}</div>}
                                {percentages.cagr && (
                                  <div>{percentages.cagr}</div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                    {stock.daysHeld || "-"}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    {stock.taxSlab ? (
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          stock.taxSlab === "Long Term"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {stock.taxSlab}
                      </span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(stock.taxAmount)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onEdit(stock)}
                        className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 p-1 rounded"
                        title="Edit stock"
                      >
                        <FiEdit2 size={14} />
                      </button>
                      <button
                        onClick={() => onDelete(stock._id)}
                        className="text-red-600 hover:text-red-900 hover:bg-red-50 p-1 rounded"
                        title="Delete stock"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 sm:px-6">
          <div className="flex justify-between flex-1 sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{" "}
                <span className="font-medium">
                  {(currentPage - 1) * itemsPerPage + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, stocks.length)}
                </span>{" "}
                of <span className="font-medium">{stocks.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNum
                            ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                            : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (
                    pageNum === currentPage - 2 ||
                    pageNum === currentPage + 2
                  ) {
                    return (
                      <span
                        key={pageNum}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                      >
                        ...
                      </span>
                    );
                  }
                  return null;
                })}

                <button
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockTable;