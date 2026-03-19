import { useEffect, useState, useCallback } from "react";

const API = import.meta.env.VITE_API_URL || "https://api.simplysnox.com";

const categories = ["all", "audio", "thumbnails", "logos", "branding", "misc"];

export default function App() {
    const [files, setFiles] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [category, setCategory] = useState("misc");
    const [filter, setFilter] = useState("all");
    const [authorized, setAuthorized] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [search, setSearch] = useState("");

    const fetchFiles = async () => {
        try {
            const res = await fetch(`${API}/files`, {
                credentials: "include"
            });

            if (res.status === 401) {
                setAuthorized(false);
                setLoading(false);
                return;
            }

            const data = await res.json();
            setFiles(data);
            setAuthorized(true);
        } catch {
            setAuthorized(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, []);

    const upload = async (file) => {
        if (!file) return;

        setUploading(true);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", category);

        await fetch(`${API}/upload`, {
            method: "POST",
            body: formData,
            credentials: "include"
        });

        setUploading(false);
        setSelectedFile(null);
        fetchFiles();
    };

    // 🖱️ Drag & Drop
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        upload(file);
    }, [category]);

    const filtered = files
        .filter(f => filter === "all" || f.category === filter)
        .filter(f =>
            f.name.toLowerCase().includes(search.toLowerCase())
        );

    // 🔐 Not logged in
    if (authorized === false) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
                <a
                    href={`${API}/auth/discord`}
                    className="bg-indigo-600 px-6 py-3 rounded-xl"
                >
                    Login with Discord
                </a>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
                Loading...
            </div>
        );
    }

    return (
        <div
            className="min-h-screen bg-zinc-950 text-white p-6"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
        >
            <div className="max-w-6xl mx-auto">

                {/* Header */}
                <div className="flex justify-between mb-6">
                    <h1 className="text-3xl font-bold">QS Assets</h1>
                    <a href={`${API}/logout`} className="text-sm">Logout</a>
                </div>

                {/* Upload */}
                <div className="bg-zinc-900 p-4 rounded-2xl mb-6">
                    <div className="flex flex-col md:flex-row gap-3">

                        <input
                            type="file"
                            onChange={(e) => setSelectedFile(e.target.files[0])}
                        />

                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="bg-zinc-800 px-3 py-2 rounded-lg"
                        >
                            {categories.slice(1).map(c => (
                                <option key={c}>{c}</option>
                            ))}
                        </select>

                        <button
                            onClick={() => upload(selectedFile)}
                            className="bg-indigo-600 px-4 py-2 rounded-lg"
                        >
                            {uploading ? "Uploading..." : "Upload"}
                        </button>
                    </div>

                    {/* Drag hint */}
                    <div className="text-zinc-500 text-sm mt-2">
                        Drag & drop files anywhere to upload
                    </div>
                </div>

                {/* Search */}
                <input
                    type="text"
                    placeholder="Search files..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full mb-4 px-4 py-2 rounded-xl bg-zinc-800"
                />

                {/* Filters */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {categories.map(c => (
                        <button
                            key={c}
                            onClick={() => setFilter(c)}
                            className={`px-4 py-1 rounded-full text-sm ${filter === c
                                    ? "bg-indigo-600"
                                    : "bg-zinc-800"
                                }`}
                        >
                            {c}
                        </button>
                    ))}
                </div>

                {/* Files */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {filtered.map(file => (
                        <div
                            key={file.id}
                            className="bg-zinc-900 p-3 rounded-2xl"
                        >
                            {/* 🖼️ Image Preview */}
                            {file.type.startsWith("image") && (
                                <img
                                    src={file.url}
                                    className="w-full h-40 object-cover rounded-lg mb-2"
                                />
                            )}

                            <a
                                href={file.url}
                                target="_blank"
                                className="text-indigo-400 text-sm break-all"
                            >
                                {file.name}
                            </a>

                            {/* Pills */}
                            <div className="flex flex-wrap gap-1 mt-2 text-xs">
                                <span className="bg-zinc-800 px-2 py-1 rounded-full">
                                    {file.category}
                                </span>

                                <span className="bg-zinc-800 px-2 py-1 rounded-full">
                                    {(file.size / 1024).toFixed(1)} KB
                                </span>
                            </div>

                            {/* 👤 uploader */}
                            <div className="text-xs text-zinc-500 mt-2">
                                uploaded by {file.uploader}
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}