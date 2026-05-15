import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Users,
  Ban,
  CheckCircle,
  FileCheck,
  FileX,
  TrendingUp,
  Search,
} from "lucide-react";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { useQuery, useQueryClient } from "react-query";
import { api } from "../services/api";
import Button from "../components/ui/Button";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import toast from "react-hot-toast";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
);

const AdminDashboard = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("metrics");
  const [userSearch, setUserSearch] = useState("");
  const [userType, setUserType] = useState("all");
  const [ideaStatus, setIdeaStatus] = useState("pending");
  const [ideaSearch, setIdeaSearch] = useState("");

  const { data: metricsData, isLoading: metricsLoading } = useQuery(
    "adminMetrics",
    api.admin.getMetrics,
  );

  const { data: usersData, isLoading: usersLoading } = useQuery(
    ["adminUsers", userSearch, userType],
    () =>
      api.admin.getUsers({
        page: 1,
        limit: 50,
        search: userSearch || undefined,
        userType: userType !== "all" ? userType : undefined,
      }),
  );

  const { data: ideasData, isLoading: ideasLoading } = useQuery(
    ["adminIdeas", ideaStatus, ideaSearch],
    () =>
      api.admin.getIdeas({
        page: 1,
        limit: 50,
        status: ideaStatus,
        search: ideaSearch || undefined,
      }),
  );

  const totals = metricsData?.data?.totals;
  const charts = metricsData?.data?.charts;
  const topProjects = metricsData?.data?.topProjects || [];
  const users = usersData?.data?.users || [];
  const ideas = ideasData?.data?.ideas || [];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const fundingChartData = useMemo(() => {
    const labels = charts?.fundingByMonth?.map((m) => m.month) || [];
    const values = charts?.fundingByMonth?.map((m) => m.value) || [];
    return {
      labels,
      datasets: [
        {
          label: "Funding",
          data: values,
          borderColor: "#2563EB",
          backgroundColor: "rgba(37, 99, 235, 0.15)",
          tension: 0.35,
          fill: true,
        },
      ],
    };
  }, [charts]);

  const userChartData = useMemo(() => {
    const labels = charts?.usersByMonth?.map((m) => m.month) || [];
    const values = charts?.usersByMonth?.map((m) => m.value) || [];
    return {
      labels,
      datasets: [
        {
          label: "New Users",
          data: values,
          backgroundColor: "rgba(16, 185, 129, 0.6)",
          borderRadius: 6,
        },
      ],
    };
  }, [charts]);

  const handleBanToggle = async (user) => {
    try {
      await api.admin.banUser(user._id, !user.isBanned);
      queryClient.invalidateQueries("adminUsers");
      toast.success(user.isBanned ? "User unbanned" : "User banned");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update user");
    }
  };

  const handleVerifyToggle = async (user) => {
    try {
      await api.admin.verifyUser(user._id, !user.isVerified);
      queryClient.invalidateQueries("adminUsers");
      toast.success(user.isVerified ? "User unverified" : "User verified");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update user");
    }
  };

  const handleApproveIdea = async (ideaId) => {
    try {
      await api.admin.approveIdea(ideaId);
      queryClient.invalidateQueries("adminIdeas");
      queryClient.invalidateQueries("adminMetrics");
      toast.success("Idea approved");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to approve idea");
    }
  };

  const handleRejectIdea = async (ideaId) => {
    const reason = window.prompt("Rejection reason (optional):") || "";
    try {
      await api.admin.rejectIdea(ideaId, reason);
      queryClient.invalidateQueries("adminIdeas");
      queryClient.invalidateQueries("adminMetrics");
      toast.success("Idea rejected");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reject idea");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <p className="text-sm font-semibold text-primary-600">
              Admin Center
            </p>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary-600" />
              Platform Command
            </h1>
            <p className="text-gray-600 mt-2">
              Oversee users, approvals, and platform health in real time.
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-2">
            {[
              { key: "metrics", label: "Metrics" },
              { key: "users", label: "Users" },
              { key: "ideas", label: "Ideas" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  activeTab === tab.key
                    ? "bg-primary-600 text-white shadow"
                    : "bg-white border border-gray-200 text-gray-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "metrics" && (
          <>
            {metricsLoading ? (
              <div className="flex justify-center py-10">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500">
                      Total Funding
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {formatCurrency(totals?.totalFunding || 0)}
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500">
                      Active Users (30d)
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {totals?.activeUsers || 0}
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500">
                      Pending Ideas
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {totals?.pendingIdeas || 0}
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500">
                      Verified Users
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {totals?.verifiedUsers || 0}
                    </p>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">
                        Funding Trend
                      </h3>
                      <TrendingUp className="w-5 h-5 text-primary-600" />
                    </div>
                    <Line data={fundingChartData} />
                  </div>
                  <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">New Users</h3>
                      <Users className="w-5 h-5 text-green-600" />
                    </div>
                    <Bar data={userChartData} />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Top Projects
                  </h3>
                  <div className="space-y-3">
                    {topProjects.map((project) => (
                      <div
                        key={project._id}
                        className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {project.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {project.creator?.name || "Unknown"}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-primary-600">
                          {formatCurrency(project.currentFunding)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "users" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search users by name, email, company"
                  className="w-72 max-w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={userType}
                  onChange={(e) => setUserType(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">All roles</option>
                  <option value="innovator">Innovator</option>
                  <option value="investor">Investor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {usersLoading ? (
              <div className="flex justify-center py-6">
                <LoadingSpinner size="md" />
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <div
                    key={user._id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-gray-200 rounded-xl px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                      <div className="flex gap-2 mt-2 text-xs">
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                          {user.userType}
                        </span>
                        {user.isVerified && (
                          <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                            Verified
                          </span>
                        )}
                        {user.isBanned && (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                            Banned
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleVerifyToggle(user)}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {user.isVerified ? "Unverify" : "Verify"}
                      </Button>
                      <Button
                        variant="outline"
                        className="text-red-600 border-red-200"
                        onClick={() => handleBanToggle(user)}
                      >
                        <Ban className="w-4 h-4 mr-2" />
                        {user.isBanned ? "Unban" : "Ban"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "ideas" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  value={ideaSearch}
                  onChange={(e) => setIdeaSearch(e.target.value)}
                  placeholder="Search ideas"
                  className="w-72 max-w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={ideaStatus}
                  onChange={(e) => setIdeaStatus(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="pending">Pending</option>
                  <option value="published">Published</option>
                  <option value="rejected">Rejected</option>
                  <option value="all">All</option>
                </select>
              </div>
            </div>

            {ideasLoading ? (
              <div className="flex justify-center py-6">
                <LoadingSpinner size="md" />
              </div>
            ) : (
              <div className="space-y-4">
                {ideas.map((idea) => (
                  <div
                    key={idea._id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-gray-200 rounded-xl px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {idea.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {idea.creator?.name || "Unknown creator"}
                      </p>
                      <div className="flex gap-2 mt-2 text-xs">
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                          {idea.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleApproveIdea(idea._id)}
                      >
                        <FileCheck className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        className="text-red-600 border-red-200"
                        onClick={() => handleRejectIdea(idea._id)}
                      >
                        <FileX className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
