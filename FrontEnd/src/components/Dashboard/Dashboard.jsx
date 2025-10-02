import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiPlus,
  FiFolder,
  FiTrendingUp,
  FiLogOut,
  FiEdit2,
  FiTrash2,
  FiBarChart,
} from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { portfolioService } from "../../services/api.jsx";
import Button from "../UI/Button.jsx";
import Modal from "../UI/Modal.jsx";
import LoadingSpinner from "../UI/LoadingSpinner.jsx";
import { format } from "date-fns";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  // Get first letter of email in uppercase
  const getEmailInitial = () => {
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U"; // Default fallback
  };

  useEffect(() => {
    loadPortfolios();
  }, []);

  const loadPortfolios = async () => {
    try {
      setLoading(true);
      const data = await portfolioService.getAll();
      setPortfolios(data);
    } catch (err) {
      setError("Failed to load portfolios");
      console.error("Error loading portfolios:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePortfolio = async (e) => {
    e.preventDefault();
    try {
      await portfolioService.create(formData);
      setFormData({ name: "", description: "" });
      setShowCreateModal(false);
      loadPortfolios();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create portfolio");
    }
  };

  const handleEditPortfolio = async (e) => {
    e.preventDefault();
    if (!editingPortfolio) return;

    try {
      await portfolioService.update(editingPortfolio._id, formData);
      setFormData({ name: "", description: "" });
      setShowEditModal(false);
      setEditingPortfolio(null);
      loadPortfolios();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update portfolio");
    }
  };

  const handleDeletePortfolio = async (portfolio) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${portfolio.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await portfolioService.delete(portfolio._id);
      loadPortfolios();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete portfolio");
    }
  };

  const openCreateModal = () => {
    setFormData({ name: "", description: "" });
    setShowCreateModal(true);
  };

  const openEditModal = (portfolio) => {
    setEditingPortfolio(portfolio);
    setFormData({
      name: portfolio.name,
      description: portfolio.description || "",
    });
    setShowEditModal(true);
  };

  const calculatePortfolioStats = (stocks) => {
    const totalStocks = stocks.length;
    const totalInvestment = stocks.reduce(
      (sum, stock) => sum + (stock.purchaseAmount || 0),
      0
    );
    const totalCurrentValue = stocks.reduce(
      (sum, stock) => sum + (stock.cmpAmount || stock.purchaseAmount || 0),
      0
    );
    const totalProfitLoss = totalCurrentValue - totalInvestment;

    return {
      totalStocks,
      totalInvestment,
      totalCurrentValue,
      totalProfitLoss,
      profitLossPercentage:
        totalInvestment > 0 ? (totalProfitLoss / totalInvestment) * 100 : 0,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 gap-3">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <FiTrendingUp className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                  Stock Portfolio Manager
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate">
                  Welcome back, {user?.fullName || user?.username}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3 self-end sm:self-auto">
              {/* Email Initial Avatar */}
              <div className="h-9 w-9 sm:h-10 sm:w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center border-2 border-blue-200 shadow-sm flex-shrink-0">
                <span className="text-white font-semibold text-base sm:text-lg">
                  {getEmailInitial()}
                </span>
              </div>

              <Button
                variant="secondary"
                onClick={logout}
                icon={<FiLogOut />}
                className="hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-sm"
              >
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
            <button
              onClick={() => setError("")}
              className="ml-4 text-red-500 hover:text-red-700 text-sm underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Your Portfolios
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Manage your stock investments across different portfolios
            </p>
          </div>
          <Button
            onClick={openCreateModal}
            icon={<FiPlus />}
            className="shadow-lg w-full sm:w-auto"
          >
            New Portfolio
          </Button>
        </div>

        {/* Portfolio Grid */}
        {portfolios.length === 0 ? (
          <div className="text-center py-16">
            <FiFolder className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No portfolios yet
            </h3>
            <p className="text-gray-600 mb-6">
              Get started by creating your first stock portfolio
            </p>
            <Button onClick={openCreateModal} icon={<FiPlus />}>
              Create Portfolio
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {portfolios.map((portfolio) => {
              const stats = calculatePortfolioStats(portfolio.stocks);

              return (
                <div
                  key={portfolio._id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => navigate(`/portfolio/${portfolio._id}`)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <FiBarChart className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                          {portfolio.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {stats.totalStocks} stocks
                        </p>
                      </div>
                    </div>

                    <div className="flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(portfolio);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <FiEdit2 size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePortfolio(portfolio);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {portfolio.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {portfolio.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Investment</span>
                      <span className="font-medium">
                        ₹{stats.totalInvestment.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Current Value</span>
                      <span className="font-medium">
                        ₹{stats.totalCurrentValue.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">P&L</span>
                      <div className="flex flex-col items-end">
                        <span
                          className={`font-medium ${
                            stats.totalProfitLoss >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {stats.totalProfitLoss >= 0 ? "+" : ""}₹
                          {stats.totalProfitLoss.toLocaleString("en-IN")}
                        </span>

                        {stats.profitLossPercentage !== 0 && (
                          <span
                            className={`text-xs ${
                              stats.profitLossPercentage >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            AR({stats.profitLossPercentage >= 0 ? "+" : ""}
                            {stats.profitLossPercentage.toFixed(2)}%)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Last Updated */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      {portfolio.lastCmpUpdate ? (
                        <>
                          Prices updated{" "}
                          {format(
                            new Date(portfolio.lastCmpUpdate),
                            "MMM d, h:mm a"
                          )}
                        </>
                      ) : (
                        <>
                          Created{" "}
                          {format(new Date(portfolio.createdAt), "MMM d, yyyy")}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Portfolio Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Portfolio"
        size="md"
      >
        <form onSubmit={handleCreatePortfolio} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Portfolio Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Retirement Portfolio"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Brief description of this portfolio..."
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Create Portfolio
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Portfolio Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Portfolio"
        size="md"
      >
        <form onSubmit={handleEditPortfolio} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Portfolio Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowEditModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Update Portfolio
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Dashboard;