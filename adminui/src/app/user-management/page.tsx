// app/users/page.tsx
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Search,
  Filter,
  Plus,
  User as UserIcon,
  Shield,
  Mail,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Trash2,
  Edit,
  Loader2,
} from "lucide-react";
import { fetchAdminUsers } from "@/lib/api";

type Role = "Admin" | "User";
type Status = "active" | "suspended" | "terminated" | "invited";
type RowAction = "" | "edit" | "activate" | "suspend" | "terminate" | "delete";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: Status;
  createdAt?: string;
  lastLogin?: string;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch users from backend
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const adminUsers = await fetchAdminUsers();
        
        // Map backend users to frontend User interface
        const mappedUsers: User[] = adminUsers.map((u) => ({
          id: u._id,
          name: u.name || "Unknown",
          email: u.email || u.phone || "No email",
          role: u.role === "admin" ? "Admin" : "User",
          status: "active" as Status, // Default to active, can be extended later
          createdAt: u.createdAt || undefined,
          lastLogin: u.lastLoginAt || undefined,
        }));
        
        setUsers(mappedUsers);
      } catch (err) {
        console.error("Failed to fetch users:", err);
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: unknown }).message)
            : "Failed to load users";
        setError(message);
        toast.error("Failed to load users");
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  // search & filters
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return users.filter((u) => {
      const matchesQuery =
        !query ||
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query);
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const matchesStatus = statusFilter === "all" || u.status === statusFilter;
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [users, q, roleFilter, statusFilter]);

  // create/edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "User" as Role,
    status: "active" as Status,
  });

  // confirm dialog
  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    desc?: string;
    onConfirm?: () => void;
  }>({ open: false, title: "" });

  const resetForm = () =>
    setFormData({ name: "", email: "", role: "User", status: "active" });

  const openCreate = () => {
    setEditingUser(null);
    resetForm();
    setShowModal(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    });
    setShowModal(true);
  };

  const isEmail = (v: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim().toLowerCase());

  const handleCreateOrUpdate = () => {
    if (!formData.name.trim()) return toast.error("Name is required.");
    if (!isEmail(formData.email)) return toast.error("Enter a valid email.");

    if (editingUser) {
      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? { ...u, ...formData } : u))
      );
      toast.success("User updated.");
    } else {
      const newUser: User = {
        id: Date.now().toString(),
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
        status: formData.status,
        createdAt: new Date().toISOString(),
      };
      setUsers((prev) => [newUser, ...prev]);
      toast.success("User created.");
    }

    setShowModal(false);
    setEditingUser(null);
    resetForm();
  };

  const setStatus = (id: string, status: Status) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status } : u)));
  };

  const handleActivate = (u: User) => {
    if (u.status === "active") return;
    setStatus(u.id, "active");
    toast.success(`${u.name} activated.`);
  };

  const handleSuspend = (u: User) => {
    if (u.status === "terminated") {
      return toast.error("Cannot suspend a terminated user.");
    }
    if (u.status === "suspended") return;
    setStatus(u.id, "suspended");
    toast.warning(`${u.name} suspended.`);
  };

  const handleTerminate = (u: User) => {
    setConfirm({
      open: true,
      title: "Terminate user?",
      desc:
        "This revokes access immediately. You can delete the account later if needed.",
      onConfirm: () => {
        setStatus(u.id, "terminated");
        toast.success(`${u.name} terminated.`);
      },
    });
  };

  const handleDelete = (u: User) => {
    setConfirm({
      open: true,
      title: "Delete user?",
      desc:
        "This will permanently remove the user record. This cannot be undone.",
      onConfirm: () => {
        setUsers((prev) => prev.filter((x) => x.id !== u.id));
        toast.success(`${u.name} deleted.`);
      },
    });
  };

  const handleRowAction = (action: RowAction, u: User) => {
    switch (action) {
      case "edit":
        openEdit(u);
        break;
      case "activate":
        handleActivate(u);
        break;
      case "suspend":
        handleSuspend(u);
        break;
      case "terminate":
        handleTerminate(u);
        break;
      case "delete":
        handleDelete(u);
        break;
      default:
        break;
    }
  };

  const statusBadge = (s: Status) => {
    switch (s) {
      case "active":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "suspended":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "terminated":
        return "bg-rose-500/10 text-rose-600 border-rose-500/20";
      case "invited":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const statusIcon = (s: Status) => {
    switch (s) {
      case "active": return <CheckCircle2 className="w-3.5 h-3.5" />;
      case "suspended": return <AlertTriangle className="w-3.5 h-3.5" />;
      case "terminated": return <XCircle className="w-3.5 h-3.5" />;
      case "invited": return <Mail className="w-3.5 h-3.5" />;
      default: return <Clock className="w-3.5 h-3.5" />;
    }
  };

  const formatDate = (d?: string) =>
    d
      ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
      : "—";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <AlertTriangle className="w-8 h-8 text-destructive" />
          <p className="text-destructive">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage system access and user roles</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition shadow-lg shadow-primary/20"
        >
          <Plus className="w-5 h-5" />
          Create User
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="relative">
            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              value={roleFilter}
              onChange={(e) =>
                setRoleFilter(
                  e.target.value === "all" ? "all" : (e.target.value as Role)
                )
              }
              className="w-full pl-9 pr-8 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer transition-all"
            >
              <option value="all">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="User">User</option>
            </select>
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value === "all" ? "all" : (e.target.value as Status)
                )
              }
              className="w-full pl-9 pr-8 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer transition-all"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="invited">Invited</option>
              <option value="suspended">Suspended</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Login</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((u) => {
                const canActivate = u.status !== "active";
                const canSuspend = u.status !== "suspended" && u.status !== "terminated";
                return (
                  <tr key={u.id} className="group hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{u.name}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Shield className="w-4 h-4 text-muted-foreground" />
                        <span>{u.role}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusBadge(u.status)}`}>
                        {statusIcon(u.status)}
                        <span className="capitalize">{u.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {formatDate(u.lastLogin)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 transition-opacity">
                        <button
                          onClick={() => handleRowAction("edit", u)}
                          className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {canActivate && (
                          <button
                            onClick={() => handleRowAction("activate", u)}
                            className="p-2 rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600 transition-colors"
                            title="Activate"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}

                        {canSuspend && (
                          <button
                            onClick={() => handleRowAction("suspend", u)}
                            className="p-2 rounded-lg hover:bg-amber-500/10 text-muted-foreground hover:text-amber-600 transition-colors"
                            title="Suspend"
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => handleRowAction("delete", u)}
                          className="p-2 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <UserIcon className="w-12 h-12 mb-4 opacity-20" />
                      <p>No users found matching your filters</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setShowModal(false)}
          />
          <div className="relative w-full max-w-lg bg-background rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border bg-muted/30">
              <h4 className="text-lg font-bold">
                {editingUser ? "Edit User" : "Create User"}
              </h4>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter full name"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="name@domain.com"
                  type="email"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value as Role })
                    }
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                  >
                    <option value="User">User</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as Status,
                      })
                    }
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                  >
                    <option value="active">Active</option>
                    <option value="invited">Invited</option>
                    <option value="suspended">Suspended</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-border bg-muted/30 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingUser(null);
                  resetForm();
                }}
                className="px-5 py-2.5 rounded-xl font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrUpdate}
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
              >
                {editingUser ? "Save Changes" : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setConfirm({ open: false, title: "" })}
          />
          <div className="relative w-full max-w-md bg-background rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold mb-2">{confirm.title}</h4>
              {confirm.desc && (
                <p className="text-muted-foreground">{confirm.desc}</p>
              )}
            </div>

            <div className="p-6 border-t border-border bg-muted/30 flex justify-end gap-3">
              <button
                onClick={() => setConfirm({ open: false, title: "" })}
                className="px-5 py-2.5 rounded-xl font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirm.onConfirm?.();
                  setConfirm({ open: false, title: "" });
                }}
                className="px-5 py-2.5 bg-destructive text-destructive-foreground rounded-xl font-medium hover:bg-destructive/90 transition-colors shadow-lg shadow-destructive/20"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
