'use client';

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ArrowBigUp, Ban, CircleX, ExternalLink, Trash } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  quizzes: number;
  subscription: string;
  last_active: string | null;
}

const USERS_PER_PAGE = 20;

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [subFilter, setSubFilter] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    banned: 0,
    pro: 0
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
    setCurrentPage(1); // reset page when filters change
  }, [search, roleFilter, subFilter, users]);

  const fetchUsers = async () => {
    setLoading(true);

    try {
      const { data: usersData } = await supabase.from("users").select("*");
      const { data: usageData } = await supabase.from("usage").select("*");
      const { data: subsData } = await supabase.from("subscriptions").select("user_id, status");

      const usageMap: Record<string, any> = {};
      usageData?.forEach(u => {
        usageMap[u.user_id] = u;
      });

      const subMap: Record<string, string> = {};
      subsData?.forEach(s => {
        if (s.status === "active") {
          subMap[s.user_id] = "Pro";
        }
      });

      const enriched: User[] = usersData?.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        created_at: u.created_at,
        quizzes: usageMap[u.id]?.quizzes_created || 0,
        last_active: usageMap[u.id]?.updated_at || null,
        subscription: subMap[u.id] || "Free"
      })) || [];

      setUsers(enriched);

      setStats({
        total: enriched.length,
        active: enriched.filter(u =>
          u.last_active &&
          new Date(u.last_active) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length,
        banned: enriched.filter(u => u.role === "banned").length,
        pro: enriched.filter(u => u.subscription === "Pro").length
      });

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let data = [...users];

    if (search) {
      data = data.filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (roleFilter !== "all") {
      data = data.filter(u => u.role === roleFilter);
    }

    if (subFilter !== "all") {
      data = data.filter(u => u.subscription.toLowerCase() === subFilter);
    }

    setFilteredUsers(data);
  };

  // --- PAGINATION LOGIC ---
  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * USERS_PER_PAGE,
    currentPage * USERS_PER_PAGE
  );

  // --- ACTIONS ---
  const toggleBan = async (user: User) => {
    const isBanned = user.role === "banned";

    if (!confirm(`Are you sure you want to ${isBanned ? "unban" : "ban"} this user?`)) return;

    await supabase
      .from("users")
      .update({ role: isBanned ? "user" : "banned" })
      .eq("id", user.id);

    fetchUsers();
  };

  const changeRole = async (user: User, newRole: string) => {
    await supabase.from("users").update({ role: newRole }).eq("id", user.id);
    fetchUsers();
  };

  const deleteUser = async (user: User) => {
    if (user.role === "admin") {
      alert("Cannot delete admin");
      return;
    }

    if (!confirm("Delete user permanently?")) return;

    await supabase.from("users").delete().eq("id", user.id);
    fetchUsers();
  };

  if (loading) return <p className="animate-pulse">Loading users...</p>;

  return (
    <div className="space-y-6">

      <h1 className="text-3xl font-bold">Users</h1>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats.total} />
        <StatCard label="Active (7d)" value={stats.active} />
        <StatCard label="Banned" value={stats.banned} />
        <StatCard label="Pro Users" value={stats.pro} />
      </div>

      {/* SEARCH */}
      <div className="flex flex-wrap gap-3">
        <input
          placeholder="Search name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 border rounded-xl bg-background"
        />

        <select onChange={e => setRoleFilter(e.target.value)} className="border rounded-xl px-2">
          <option value="all">All Roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="banned">Banned</option>
        </select>

        <select onChange={e => setSubFilter(e.target.value)} className="border rounded-xl px-2">
          <option value="all">All Subs</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto border rounded-2xl bg-card">
        <table className="w-full text-sm">
          <thead className="border-b text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Last Active</th>
              <th>Quizzes</th>
              <th>Subscription</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginatedUsers.map(u => (
              <tr key={u.id} className="border-b hover:bg-muted/40 transition">
                <td className="p-3 font-medium">{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{new Date(u.created_at).toLocaleDateString()}</td>
                <td>{u.last_active ? new Date(u.last_active).toLocaleDateString() : "—"}</td>
                <td>{u.quizzes}</td>
                <td>{u.subscription}</td>
                <td>{u.role === "banned" ? "Banned" : "Active"}</td>

                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setSelectedUser(u)} className="p-2 hover:bg-muted rounded-md">
                      <ExternalLink size={18} />
                    </button>

                    <button onClick={() => changeRole(u, "admin")} className="p-2 hover:bg-muted rounded-md">
                      <ArrowBigUp size={18} />
                    </button>

                    <button onClick={() => toggleBan(u)} className="p-2 rounded-md">
                      {u.role === "banned" ? "Unban" : <Ban size={18} />}
                    </button>

                    <button onClick={() => deleteUser(u)} className="p-2 hover:bg-destructive/10 rounded-md">
                      <Trash size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </p>

        <div className="flex gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className="px-3 py-1 border rounded-lg disabled:opacity-50"
          >
            Prev
          </button>

          {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => {
            const page = i + 1;
            return (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 rounded-lg border ${
                  currentPage === page ? "bg-primary text-white" : ""
                }`}
              >
                {page}
              </button>
            );
          })}

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
            className="px-3 py-1 border rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* DRAWER (unchanged) */}
      {selectedUser && (
        <div className="fixed right-0 top-0 w-80 h-full bg-background border-l p-5 shadow-xl">
          <button onClick={() => setSelectedUser(null)}><CircleX /></button>

          <h2 className="text-xl font-bold mt-4">{selectedUser.name}</h2>
          <p className="text-muted-foreground">{selectedUser.email}</p>

          <div className="mt-4 space-y-2">
            <p>Role: {selectedUser.role}</p>
            <p>Quizzes: {selectedUser.quizzes}</p>
            <p>Subscription: {selectedUser.subscription}</p>

            {selectedUser.quizzes > 50 && <p>🔥 Power User</p>}
            {selectedUser.subscription === "Pro" && <p>💰 Paying User</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 border rounded-2xl bg-card shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <h2 className="text-xl font-bold mt-1">{value}</h2>
    </div>
  );
}