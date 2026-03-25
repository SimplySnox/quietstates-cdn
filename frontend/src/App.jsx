import { useEffect, useState, useRef } from "react";

const API = "https://api.quietstates.xyz";

// Expanded categories with groups
const categories = [
    "all",              // everything
    "image",            // photos, illustrations
    "video",            // full-length videos
    "audio",            // music, SFX, voiceovers
    "thumbnails",       // preview images
    "logos",            // brand logos
    "branding",         // style guides, color palettes
    "archive",          // old/unused files
    "misc",             // catch-all

    // Expanded Categories
    "project_files",    // PSD, AI, Figma, Blender, After Effects, Premiere, etc.
    "documents",        // PDFs, scripts, guides, DOCX, TXT
    "templates",        // video/audio/design templates, LUTs, effects presets
    "animations",       // GIFs, motion graphics
    "fonts",            // font files
    "reference",        // moodboards, screenshots, concept art
    "icons",            // small icons for UI or designs
    "sprites",          // game assets or sprite sheets
    "vector_art",       // SVG, EPS, Illustrator files
    "effects_presets",  // audio/video presets, LUTs, filters
    "stock_assets",     // stock images, videos, or audio for projects
];

export default function App() {
    const [files, setFiles] = useState([]);
    const [file, setFile] = useState(null);
    const [progress, setProgress] = useState(0);
    const [user, setUser] = useState(null);
    const [filter, setFilter] = useState("all");
    const [category, setCategory] = useState("misc");
    const dropRef = useRef();

    useEffect(() => {
        const init = async () => {
            const me = await fetch(`${API}/me`, { credentials: "include" });
            const u = await me.json();
            if (!u) {
                window.location.href = `${API}/auth/discord`;
                return;
            }
            setUser(u);

            const res = await fetch(`${API}/files`, { credentials: "include" });
            setFiles(await res.json());
        };
        init();
    }, []);

    const uploadFile = (f, rename) => {
        if (!f) return;

        const formData = new FormData();
        formData.append("file", f);
        formData.append("category", category);
        if (rename) formData.append("rename", rename);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API}/upload`);
        xhr.withCredentials = true;

        xhr.upload.onprogress = (e) => {
            setProgress((e.loaded / e.total) * 100);
        };

        xhr.onload = async () => {
            setProgress(0);
            setFile(null);
            document.getElementById("rename").value = "";

            const res = await fetch(`${API}/files`, { credentials: "include" });
            setFiles(await res.json());
        };

        xhr.send(formData);
    };

    const remove = async (id) => {
        const res = await fetch(`${API}/files/${id}`, {
            method: "DELETE",
            credentials: "include"
        });

        const data = await res.json();
        if (data.success) {
            const username = data.deletedBy?.username;
            if (username) {
                // alert(`[dev] file deleted by: ${username}`);
                console.log(`[dev] file deleted by: ${username}`);
            }
            setFiles(files.filter((f) => f.id !== id));
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();

        dropRef.current.classList.remove("ring-2", "ring-indigo-500");

        const dt = e.dataTransfer;
        if (dt.files && dt.files.length > 0) {
            uploadFile(dt.files[0]);
            dt.clearData();
        }
    };

    const filtered = files
        .filter((f) => filter === "all" || f.category === filter)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return (
        <div
            className="min-h-screen bg-zinc-950 text-white"
            ref={dropRef}
            onDragOver={(e) => {
                e.preventDefault();
                dropRef.current.classList.add("ring-2", "ring-indigo-500");
            }}
            onDragLeave={() => {
                dropRef.current.classList.remove("ring-2", "ring-indigo-500");
            }}
            onDrop={handleDrop}
        >
            <div className="max-w-7xl mx-auto p-8">

                {/* Header */}
                <div className="flex justify-between items-center mb-10">
                    <h1 className="text-4xl font-bold tracking-tight">QS Assets</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-zinc-400">{user?.username}</span>
                        <a
                            href={`${API}/logout`}
                            className="px-4 py-2 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition"
                        >
                            Logout
                        </a>
                    </div>
                </div>

                {/* Upload */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-10 shadow-lg">
                    <div className="flex flex-col md:flex-row gap-4 items-center">

                        {/* File picker */}
                        <label className="flex-1 cursor-pointer bg-zinc-800 hover:bg-zinc-700 transition rounded-xl px-4 py-3 text-sm text-zinc-300 flex items-center justify-between">
                            <span>{file ? file.name : "Choose file..."}</span>
                            <span className="text-xs text-zinc-500">Browse</span>
                            <input
                                type="file"
                                className="hidden"
                                onChange={(e) => setFile(e.target.files[0])}
                            />
                        </label>

                        {/* Rename */}
                        <input
                            type="text"
                            placeholder="Rename (optional)"
                            id="rename"
                            className="bg-zinc-800 border border-zinc-700 focus:border-indigo-500 outline-none px-4 py-3 rounded-xl text-sm w-full md:w-56"
                        />

                        {/* Category */}
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="bg-zinc-800 border border-zinc-700 focus:border-indigo-500 px-4 py-3 rounded-xl text-sm"
                        >
                            <optgroup label="Media">
                                <option>image</option>
                                <option>video</option>
                                <option>audio</option>
                                <option>animations</option>
                                <option>thumbnails</option>
                            </optgroup>
                            <optgroup label="Branding">
                                <option>logos</option>
                                <option>branding</option>
                                <option>fonts</option>
                                <option>icons</option>
                            </optgroup>
                            <optgroup label="Projects">
                                <option>project_files</option>
                                <option>templates</option>
                                <option>effects_presets</option>
                                <option>documents</option>
                                <option>reference</option>
                                <option>stock_assets</option>
                            </optgroup>
                            <option>archive</option>
                            <option>misc</option>
                        </select>

                        {/* Upload button */}
                        <button
                            onClick={() =>
                                uploadFile(
                                    file,
                                    document.getElementById("rename")?.value
                                )
                            }
                            className="bg-indigo-600 px-6 py-3 rounded-xl hover:bg-indigo-500 active:scale-[0.98] transition text-sm font-medium"
                        >
                            Upload
                        </button>
                    </div>

                    {/* Progress */}
                    {progress > 0 && (
                        <div className="mt-4 w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                            <div
                                className="bg-indigo-500 h-2 transition-all"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    )}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 mb-8">
                    {categories.map((c) => (
                        <button
                            key={c}
                            onClick={() => setFilter(c)}
                            className={`px-4 py-1 rounded-full text-sm transition ${filter === c
                                ? "bg-indigo-600"
                                : "bg-zinc-800 hover:bg-zinc-700"
                                }`}
                        >
                            {c}
                        </button>
                    ))}
                </div>

                {/* File grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {filtered.map((f) => (
                        <div
                            key={f.id}
                            className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition group"
                        >
                            {f.type.startsWith("image") ? (
                                <img
                                    src={f.url}
                                    className="h-40 w-full object-cover group-hover:opacity-90 transition"
                                />
                            ) : (
                                <div className="h-40 flex items-center justify-center text-zinc-600 text-sm">
                                    {f.type.includes("audio")
                                        ? "🎵 Audio"
                                        : "📄 File"}
                                </div>
                            )}

                            <div className="p-4">
                                <div className="text-sm font-medium truncate">
                                    {f.name}
                                </div>
                                <div className="text-xs text-zinc-500 mt-1">
                                    {f.category} • {f.uploader}
                                </div>

                                <div className="flex justify-between mt-4 items-center">
                                    <a
                                        href={f.url}
                                        target="_blank"
                                        className="text-indigo-400 text-xs hover:underline"
                                    >
                                        Open
                                    </a>

                                    <button
                                        onClick={() => remove(f.id)}
                                        className="text-red-400 text-xs opacity-70 hover:opacity-100 transition"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Empty state */}
                {files.length === 0 && (
                    <div className="text-center text-zinc-500 mt-20">
                        <div className="text-lg mb-2">No files yet</div>
                        <div className="text-sm">
                            Upload something to get started
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
