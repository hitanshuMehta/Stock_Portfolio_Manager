// import React, { useState, useEffect } from "react";

// // Helper function to format date to yyyy-MM-dd
// const formatDate = (date) => {
//   const d = new Date(date);
//   const year = d.getFullYear();
//   const month = String(d.getMonth() + 1).padStart(2, "0");
//   const day = String(d.getDate()).padStart(2, "0");
//   return `${year}-${month}-${day}`;
// };

// const Button = ({
//   children,
//   type = "button",
//   variant = "primary",
//   loading,
//   onClick,
//   className = "",
// }) => {
//   const baseStyles =
//     "px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
//   const variants = {
//     primary: "bg-blue-600 text-white hover:bg-blue-700",
//     secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
//   };

//   return (
//     <button
//       type={type}
//       onClick={onClick}
//       disabled={loading}
//       className={`${baseStyles} ${variants[variant]} ${className}`}
//     >
//       {loading ? "Loading..." : children}
//     </button>
//   );
// };

// const StockForm = ({ stock, onSubmit, onCancel }) => {
//   const [formData, setFormData] = useState({
//     symbol: "",
//     shortName: "",
//     fullName: "",
//     ineIsin: "",
//     purchaseDate: "",
//     quantity: "",
//     pricePerStock: "",
//     purchaseAmount: "",
//   });
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [symbolError, setSymbolError] = useState("");

//   // Search state
//   const [searchQuery, setSearchQuery] = useState("");
//   const [searchResults, setSearchResults] = useState([]);
//   const [searching, setSearching] = useState(false);
//   const [showDropdown, setShowDropdown] = useState(false);

//   useEffect(() => {
//     if (stock) {
//       const pricePerStock =
//         stock.purchaseAmount && stock.quantity
//           ? (stock.purchaseAmount / stock.quantity).toFixed(2)
//           : "";

//       setFormData({
//         symbol: stock.symbol || "",
//         shortName: stock.shortName || "",
//         fullName: stock.fullName || "",
//         ineIsin: stock.ineIsin || "",
//         purchaseDate: stock.purchaseDate ? formatDate(stock.purchaseDate) : "",
//         quantity: stock.quantity?.toString() || "",
//         pricePerStock: pricePerStock,
//         purchaseAmount: stock.purchaseAmount?.toString() || "",
//       });
//       setSearchQuery(stock.fullName || "");
//     }
//   }, [stock]);

//   // Search companies as user types
//   useEffect(() => {
//     const searchCompanies = async () => {
//       if (searchQuery.length < 2) {
//         setSearchResults([]);
//         setShowDropdown(false);
//         return;
//       }

//       setSearching(true);
//       try {
//        const response = await fetch(
//           `${VITE_API_URL}/companies/search?q=${encodeURIComponent(searchQuery)}`
//         );
//         if (response.ok) {
//           const data = await response.json();
//           setSearchResults(data);
//           setShowDropdown(true);
//         }
//       } catch (err) {
//         console.error("Search error:", err);
//       } finally {
//         setSearching(false);
//       }
//     };

//     const debounceTimer = setTimeout(searchCompanies, 300);
//     return () => clearTimeout(debounceTimer);
//   }, [searchQuery]);

//   // Auto-fill form when company is selected
//   const handleCompanySelect = (company) => {
//     setFormData({
//       ...formData,
//       symbol: company.symbol,
//       shortName: company.shortName,
//       fullName: company.fullName,
//       ineIsin: company.ineIsin,
//     });
//     setSearchQuery(company.fullName);
//     setShowDropdown(false);
//     setSearchResults([]);
//     setSymbolError("");
//   };

//   // Validate symbol for .NSE or .BSE suffix
//   const validateSymbol = (symbol) => {
//     if (!symbol.trim()) {
//       setSymbolError("");
//       return true;
//     }
//     const upperSymbol = symbol.toUpperCase();
//     if (!upperSymbol.endsWith(".NSE") && !upperSymbol.endsWith(".BSE")) {
//       setSymbolError("Symbol must end with .NSE or .BSE suffix");
//       return false;
//     }
//     setSymbolError("");
//     return true;
//   };

//   const handleSymbolChange = (value) => {
//     const upperValue = value.toUpperCase();
//     setFormData({ ...formData, symbol: upperValue });
//     validateSymbol(upperValue);
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError("");
//     setLoading(true);

//     // Validate symbol suffix
//     if (!validateSymbol(formData.symbol)) {
//       setError("Please add .NSE or .BSE suffix to the stock symbol");
//       setLoading(false);
//       return;
//     }

//     if (
//       !formData.symbol ||
//       !formData.shortName ||
//       !formData.fullName ||
//       !formData.ineIsin ||
//       !formData.purchaseDate ||
//       !formData.quantity ||
//       !formData.purchaseAmount
//     ) {
//       setError("Please fill in all required fields");
//       setLoading(false);
//       return;
//     }

//     if (
//       parseFloat(formData.quantity) <= 0 ||
//       parseFloat(formData.purchaseAmount) <= 0
//     ) {
//       setError("Quantity and purchase amount must be greater than 0");
//       setLoading(false);
//       return;
//     }

//     try {
//       await onSubmit({
//         symbol: formData.symbol.toUpperCase(),
//         shortName: formData.shortName,
//         fullName: formData.fullName,
//         ineIsin: formData.ineIsin,
//         purchaseDate: formData.purchaseDate,
//         quantity: parseFloat(formData.quantity),
//         purchaseAmount: parseFloat(formData.purchaseAmount),
//       });
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleInputChange = (field, value) => {
//     const newFormData = { ...formData, [field]: value };

//     if (field === "quantity" || field === "pricePerStock") {
//       const qty = parseFloat(newFormData.quantity) || 0;
//       const pricePerStock = parseFloat(newFormData.pricePerStock) || 0;

//       if (qty > 0 && pricePerStock > 0) {
//         newFormData.purchaseAmount = (qty * pricePerStock).toFixed(2);
//       }
//     } else if (field === "purchaseAmount") {
//       const qty = parseFloat(newFormData.quantity) || 0;
//       const totalAmount = parseFloat(newFormData.purchaseAmount) || 0;

//       if (qty > 0 && totalAmount > 0) {
//         newFormData.pricePerStock = (totalAmount / qty).toFixed(2);
//       }
//     }

//     setFormData(newFormData);
//   };

//   return (
//     <form onSubmit={handleSubmit} className="space-y-6">
//       {error && (
//         <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
//           {error}
//         </div>
//       )}
//       {/* Company Search with Autocomplete (Optional) */}
//       <div className="relative">
//         <label className="block text-sm font-medium text-gray-700 mb-2">
//           Search Company{" "}
//           <span className="text-gray-400 text-xs">
//             (Optional - or enter manually below)
//           </span>
//         </label>
//         <input
//           type="text"
//           value={searchQuery}
//           onChange={(e) => setSearchQuery(e.target.value)}
//           onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
//           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//           placeholder="Search by company name, symbol, short name or INE/ISIN..."
//         />

//         {searching && (
//           <div className="absolute right-3 top-11 text-gray-400">
//             <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
//           </div>
//         )}

//         {/* Dropdown Results */}
//         {showDropdown && searchResults.length > 0 && (
//           <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
//             {searchResults.map((company) => (
//               <div
//                 key={company._id}
//                 onClick={() => handleCompanySelect(company)}
//                 className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
//               >
//                 <div className="font-medium text-gray-900">
//                   {company.fullName}
//                 </div>
//                 <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
//                   <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
//                     {company.symbol}
//                   </span>
//                   <span className="text-gray-500">{company.shortName}</span>
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}

//         {showDropdown &&
//           searchQuery.length >= 2 &&
//           searchResults.length === 0 &&
//           !searching && (
//             <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500 text-sm">
//               No companies found. Please enter details manually below.
//             </div>
//           )}
//       </div>
//       {/* Manual Entry Form - Always Visible */}
//       <div className="bg-gray-50 rounded-lg p-4 space-y-4">
//         <h4 className="text-sm font-semibold text-gray-700 mb-3">
//           Company Details *
//         </h4>

//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Stock Symbol *
//             </label>
//             <input
//               type="text"
//               required
//               value={formData.symbol}
//               onChange={(e) => handleSymbolChange(e.target.value)}
//               className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase ${
//                 symbolError
//                   ? "border-red-300 bg-red-50"
//                   : "border-gray-300 bg-white"
//               }`}
//               placeholder="e.g., TCS.NSE or RELIANCE.BSE"
//             />
//             {symbolError && (
//               <p className="mt-1 text-xs text-red-600">{symbolError}</p>
//             )}
//             <p className="mt-1 text-xs text-gray-500">
//               Must include <span className="font-semibold">.NSE</span> or{" "}
//               <span className="font-semibold">.BSE</span> suffix
//             </p>
//             <p className="mt-1 text-xs text-blue-600">
//               💡 Search on{" "}
//               <a
//                 href="https://www.angelone.in/"
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 className="underline hover:text-blue-800"
//               >
//                 Angel One
//               </a>{" "}
//               to find the correct symbol
//             </p>
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Short Name *
//             </label>
//             <input
//               type="text"
//               required
//               value={formData.shortName}
//               onChange={(e) =>
//                 setFormData({ ...formData, shortName: e.target.value })
//               }
//               className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//               placeholder="e.g., TCS"
//             />
//           </div>
//         </div>

//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Full Company Name *
//           </label>
//           <input
//             type="text"
//             required
//             value={formData.fullName}
//             onChange={(e) =>
//               setFormData({ ...formData, fullName: e.target.value })
//             }
//             className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//             placeholder="e.g., Tata Consultancy Services Limited"
//           />
//         </div>

//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             INE/ISIN Number *
//           </label>
//           <input
//             type="text"
//             required
//             value={formData.ineIsin}
//             onChange={(e) =>
//               setFormData({ ...formData, ineIsin: e.target.value })
//             }
//             className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//             placeholder="e.g., INE467B01029"
//           />
//         </div>
//       </div>
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//         {/* Purchase Date */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-2">
//             Purchase Date *
//           </label>
//           <input
//             type="date"
//             required
//             value={formData.purchaseDate}
//             onChange={(e) => handleInputChange("purchaseDate", e.target.value)}
//             className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//           />
//         </div>

//         {/* Quantity */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-2">
//             Quantity *
//           </label>
//           <input
//             type="number"
//             required
//             min="0"
//             step="1"
//             value={formData.quantity}
//             onChange={(e) => handleInputChange("quantity", e.target.value)}
//             className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//             placeholder="No. of shares"
//           />
//         </div>
//       </div>
//       {/* Auto-calculating Fields */}
//       <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
//         <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
//           <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
//             <path
//               fillRule="evenodd"
//               d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z"
//               clipRule="evenodd"
//             />
//           </svg>
//           Auto-Calculate Price
//         </h4>
//         <p className="text-xs text-blue-700 mb-3">
//           Enter any two values and the third will be calculated automatically
//         </p>

//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Price Per Stock
//             </label>
//             <div className="relative">
//               <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
//               <input
//                 type="number"
//                 min="0"
//                 step="0.01"
//                 value={formData.pricePerStock}
//                 onChange={(e) =>
//                   handleInputChange("pricePerStock", e.target.value)
//                 }
//                 className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
//                 placeholder="0.00"
//               />
//             </div>
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Total Purchase Amount *
//             </label>
//             <div className="relative">
//               <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
//               <input
//                 type="number"
//                 required
//                 min="0"
//                 step="0.01"
//                 value={formData.purchaseAmount}
//                 onChange={(e) =>
//                   handleInputChange("purchaseAmount", e.target.value)
//                 }
//                 className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
//                 placeholder="0.00"
//               />
//             </div>
//           </div>
//         </div>

//         {formData.quantity &&
//           formData.pricePerStock &&
//           formData.purchaseAmount && (
//             <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
//               <p className="text-xs text-gray-600">
//                 <span className="font-semibold">Calculation:</span>{" "}
//                 {formData.quantity} shares × ₹{formData.pricePerStock} = ₹
//                 {formData.purchaseAmount}
//               </p>
//             </div>
//           )}
//       </div>
//       You said:
//       {/* Calculated Fields Info */}
//       <div className="bg-green-50 rounded-lg p-4 border border-green-200">
//         <h4 className="text-sm font-medium text-green-900 mb-2">
//           Automatically Calculated
//         </h4>
//         <p className="text-xs text-green-700">
//           Fields like CMP Rate, Profit/Loss, Tax Amount, etc. will be
//           automatically calculated when you fetch current market prices.{" "}
//         </p>
//       </div>
//       {/* Form Actions */}
//       <div className="flex space-x-3 pt-4">
//         <Button
//           type="button"
//           variant="secondary"
//           onClick={onCancel}
//           className="flex-1"
//         >
//           Cancel
//         </Button>
//         <Button
//           type="submit"
//           loading={loading}
//           className="flex-1"
//           disabled={!!symbolError}
//         >
//           {stock ? "Update Stock" : "Add Stock"}
//         </Button>
//       </div>
//     </form>
//   );
// };

// export default StockForm;


import React, { useState, useEffect } from "react";

// Helper function to format date to yyyy-MM-dd
const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const Button = ({
  children,
  type = "button",
  variant = "primary",
  loading,
  onClick,
  className = "",
}) => {
  const baseStyles =
    "px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {loading ? "Loading..." : children}
    </button>
  );
};

const StockForm = ({ stock, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    symbol: "",
    shortName: "",
    fullName: "",
    ineIsin: "",
    purchaseDate: "",
    quantity: "",
    pricePerStock: "",
    purchaseAmount: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [symbolError, setSymbolError] = useState("");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Get API URL from environment variable
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  useEffect(() => {
    if (stock) {
      const pricePerStock =
        stock.purchaseAmount && stock.quantity
          ? (stock.purchaseAmount / stock.quantity).toFixed(2)
          : "";

      setFormData({
        symbol: stock.symbol || "",
        shortName: stock.shortName || "",
        fullName: stock.fullName || "",
        ineIsin: stock.ineIsin || "",
        purchaseDate: stock.purchaseDate ? formatDate(stock.purchaseDate) : "",
        quantity: stock.quantity?.toString() || "",
        pricePerStock: pricePerStock,
        purchaseAmount: stock.purchaseAmount?.toString() || "",
      });
      setSearchQuery(stock.fullName || "");
    }
  }, [stock]);

  // Search companies as user types
  useEffect(() => {
    const searchCompanies = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      setSearching(true);
      try {
        const response = await fetch(
          `${API_URL}/companies/search?q=${encodeURIComponent(searchQuery)}`
        );
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchCompanies, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, API_URL]);

  // Auto-fill form when company is selected
  const handleCompanySelect = (company) => {
    setFormData({
      ...formData,
      symbol: company.symbol,
      shortName: company.shortName,
      fullName: company.fullName,
      ineIsin: company.ineIsin,
    });
    setSearchQuery(company.fullName);
    setShowDropdown(false);
    setSearchResults([]);
    setSymbolError("");
  };

  // Validate symbol for .NSE or .BSE suffix
  const validateSymbol = (symbol) => {
    if (!symbol.trim()) {
      setSymbolError("");
      return true;
    }
    const upperSymbol = symbol.toUpperCase();
    if (!upperSymbol.endsWith(".NSE") && !upperSymbol.endsWith(".BSE")) {
      setSymbolError("Symbol must end with .NSE or .BSE suffix");
      return false;
    }
    setSymbolError("");
    return true;
  };

  const handleSymbolChange = (value) => {
    const upperValue = value.toUpperCase();
    setFormData({ ...formData, symbol: upperValue });
    validateSymbol(upperValue);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validate symbol suffix
    if (!validateSymbol(formData.symbol)) {
      setError("Please add .NSE or .BSE suffix to the stock symbol");
      setLoading(false);
      return;
    }

    if (
      !formData.symbol ||
      !formData.shortName ||
      !formData.fullName ||
      !formData.ineIsin ||
      !formData.purchaseDate ||
      !formData.quantity ||
      !formData.purchaseAmount
    ) {
      setError("Please fill in all required fields");
      setLoading(false);
      return;
    }

    if (
      parseFloat(formData.quantity) <= 0 ||
      parseFloat(formData.purchaseAmount) <= 0
    ) {
      setError("Quantity and purchase amount must be greater than 0");
      setLoading(false);
      return;
    }

    try {
      await onSubmit({
        symbol: formData.symbol.toUpperCase(),
        shortName: formData.shortName,
        fullName: formData.fullName,
        ineIsin: formData.ineIsin,
        purchaseDate: formData.purchaseDate,
        quantity: parseFloat(formData.quantity),
        purchaseAmount: parseFloat(formData.purchaseAmount),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };

    if (field === "quantity" || field === "pricePerStock") {
      const qty = parseFloat(newFormData.quantity) || 0;
      const pricePerStock = parseFloat(newFormData.pricePerStock) || 0;

      if (qty > 0 && pricePerStock > 0) {
        newFormData.purchaseAmount = (qty * pricePerStock).toFixed(2);
      }
    } else if (field === "purchaseAmount") {
      const qty = parseFloat(newFormData.quantity) || 0;
      const totalAmount = parseFloat(newFormData.purchaseAmount) || 0;

      if (qty > 0 && totalAmount > 0) {
        newFormData.pricePerStock = (totalAmount / qty).toFixed(2);
      }
    }

    setFormData(newFormData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {/* Company Search with Autocomplete (Optional) */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search Company{" "}
          <span className="text-gray-400 text-xs">
            (Optional - or enter manually below)
          </span>
        </label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Search by company name, symbol, short name or INE/ISIN..."
        />

        {searching && (
          <div className="absolute right-3 top-11 text-gray-400">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}

        {/* Dropdown Results */}
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((company) => (
              <div
                key={company._id}
                onClick={() => handleCompanySelect(company)}
                className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
              >
                <div className="font-medium text-gray-900">
                  {company.fullName}
                </div>
                <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                    {company.symbol}
                  </span>
                  <span className="text-gray-500">{company.shortName}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {showDropdown &&
          searchQuery.length >= 2 &&
          searchResults.length === 0 &&
          !searching && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500 text-sm">
              No companies found. Please enter details manually below.
            </div>
          )}
      </div>
      {/* Manual Entry Form - Always Visible */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          Company Details *
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock Symbol *
            </label>
            <input
              type="text"
              required
              value={formData.symbol}
              onChange={(e) => handleSymbolChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase ${
                symbolError
                  ? "border-red-300 bg-red-50"
                  : "border-gray-300 bg-white"
              }`}
              placeholder="e.g., TCS.NSE or RELIANCE.BSE"
            />
            {symbolError && (
              <p className="mt-1 text-xs text-red-600">{symbolError}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Must include <span className="font-semibold">.NSE</span> or{" "}
              <span className="font-semibold">.BSE</span> suffix
            </p>
            <p className="mt-1 text-xs text-blue-600">
              💡 Search on{" "}
              <a
                href="https://www.angelone.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-800"
              >
                Angel One
              </a>{" "}
              to find the correct symbol
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Short Name *
            </label>
            <input
              type="text"
              required
              value={formData.shortName}
              onChange={(e) =>
                setFormData({ ...formData, shortName: e.target.value })
              }
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., TCS"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Company Name *
          </label>
          <input
            type="text"
            required
            value={formData.fullName}
            onChange={(e) =>
              setFormData({ ...formData, fullName: e.target.value })
            }
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Tata Consultancy Services Limited"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            INE/ISIN Number *
          </label>
          <input
            type="text"
            required
            value={formData.ineIsin}
            onChange={(e) =>
              setFormData({ ...formData, ineIsin: e.target.value })
            }
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., INE467B01029"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Purchase Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Purchase Date *
          </label>
          <input
            type="date"
            required
            value={formData.purchaseDate}
            onChange={(e) => handleInputChange("purchaseDate", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quantity *
          </label>
          <input
            type="number"
            required
            min="0"
            step="1"
            value={formData.quantity}
            onChange={(e) => handleInputChange("quantity", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="No. of shares"
          />
        </div>
      </div>
      {/* Auto-calculating Fields */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
        <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z"
              clipRule="evenodd"
            />
          </svg>
          Auto-Calculate Price
        </h4>
        <p className="text-xs text-blue-700 mb-3">
          Enter any two values and the third will be calculated automatically
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price Per Stock
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.pricePerStock}
                onChange={(e) =>
                  handleInputChange("pricePerStock", e.target.value)
                }
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Purchase Amount *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.purchaseAmount}
                onChange={(e) =>
                  handleInputChange("purchaseAmount", e.target.value)
                }
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {formData.quantity &&
          formData.pricePerStock &&
          formData.purchaseAmount && (
            <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
              <p className="text-xs text-gray-600">
                <span className="font-semibold">Calculation:</span>{" "}
                {formData.quantity} shares × ₹{formData.pricePerStock} = ₹
                {formData.purchaseAmount}
              </p>
            </div>
          )}
      </div>
      {/* Calculated Fields Info */}
      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
        <h4 className="text-sm font-medium text-green-900 mb-2">
          Automatically Calculated
        </h4>
        <p className="text-xs text-green-700">
          Fields like CMP Rate, Profit/Loss, Tax Amount, etc. will be
          automatically calculated when you fetch current market prices.{" "}
        </p>
      </div>
      {/* Form Actions */}
      <div className="flex space-x-3 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={loading}
          className="flex-1"
          disabled={!!symbolError}
        >
          {stock ? "Update Stock" : "Add Stock"}
        </Button>
      </div>
    </form>
  );
};

export default StockForm;