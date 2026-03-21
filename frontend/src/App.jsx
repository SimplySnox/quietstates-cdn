import { useEffect, useState, useRef } from "react";

const API = "https://api.simplysnox.com";
const categories = ["all", "audio", "thumbnails", "logos", "branding", "misc"];

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
            if (!u) { window.location.href = `${API}/auth/discord`; return; }
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
        xhr.upload.onprogress = (e) => setProgress((e.loaded / e.total) * 100);
        xhr.onload = async () => {
            setProgress(0);
            const res = await fetch(`${API}/files`, { credentials: "include" });
            setFiles(await res.json());
        };
        xhr.send(formData);
    };

    const remove = async id => {
        await fetch(`${API}/files/${id}`, { method: "DELETE", credentials: "include" });
        setFiles(files.filter(f => f.id !== id));
    };

    const handleDrop = e => {
        e.preventDefault();
        e.stopPropagation();
        const dt = e.dataTransfer;
        if (dt.files && dt.files.length > 0) {
            uploadFile(dt.files[0]);
            dt.clearData();
        }
    };

    const filtered = files.filter(f => filter === "all" || f.category === filter);

    return (
        <div className="min-h-screen bg-zinc-950 text-white"
            ref={dropRef}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}>
            <div className="max-w-7xl mx-auto p-8">

                {/* Header */}
                <div className="flex justify-between items-center mb-10">
                    <h1 className="text-4xl font-bold tracking-tight">QS Assets</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-zinc-400">{user?.username}</span>
                        <a href={`${API}/logout`} className="px-4 py-2 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition">Logout</a>
                    </div>
                </div>

                {/* Upload */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-10 shadow-lg flex flex-col md:flex-row gap-4 items-center">
                    <input type="file" onChange={e => setFile(e.target.files[0])} />
                    <input type="text" placeholder="Rename (optional)" className="px-3 py-1 rounded-lg text-black" id="rename" />
                    <select value={category} onChange={e => setCategory(e.target.value)} className="bg-zinc-800 px-3 py-2 rounded-lg">
                        {categories.slice(1).map(c => <option key={c}>{c}</option>)}
                    </select>
                    <button onClick={() => uploadFile(file, document.getElementById("rename")?.value)}
                        className="bg-indigo-600 px-6 py-2 rounded-xl hover:bg-indigo-500 transition">Upload</button>
                    {progress > 0 && <div className="mt-4 w-full bg-zinc-800 h-2 rounded-full overflow-hidden"><div className="bg-indigo-500 h-2 transition-all" style={{ width: `${progress}%` }} /></div>}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 mb-8">
                    {categories.map(c => <button key={c} onClick={() => setFilter(c)} className={`px-4 py-1 rounded-full text-sm ${filter === c ? "bg-indigo-600" : "bg-zinc-800"}`}>{c}</button>)}
                </div>

                {/* File grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {filtered.map(f => (
                        <div key={f.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                            {f.type.startsWith("image") && <img src={f.url} className="h-40 w-full object-cover" />}
                            <div className="p-4">
                                <div className="text-sm font-medium truncate">{f.name}</div>
                                <div className="text-xs text-zinc-500 mt-1">{f.category} • {f.uploader}</div>
                                <div className="flex justify-between mt-3">
                                    <a href={f.url} target="_blank" className="text-indigo-400 text-xs">Open</a>
                                    <button onClick={() => remove(f.id)} className="text-red-400 text-xs">Delete</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {files.length === 0 && <div className="text-center text-zinc-500 mt-20">No files uploaded yet</div>}
            </div>
        </div>
    );
}