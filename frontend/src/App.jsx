import { useEffect, useState } from "react";

const API = "https://api.simplysnox.com";

export default function App() {
    const [files, setFiles] = useState([]);
    const [file, setFile] = useState(null);
    const [progress, setProgress] = useState(0);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const init = async () => {
            const me = await fetch(`${API}/me`, { credentials: "include" });
            const user = await me.json();

            if (!user) {
                window.location.href = `${API}/auth/discord`;
                return;
            }

            setUser(user);

            const res = await fetch(`${API}/files`, {
                credentials: "include"
            });

            setFiles(await res.json());
        };

        init();
    }, []);

    const upload = () => {
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", "misc");

        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API}/upload`);
        xhr.withCredentials = true;

        xhr.upload.onprogress = (e) => {
            setProgress((e.loaded / e.total) * 100);
        };

        xhr.onload = async () => {
            setProgress(0);

            const res = await fetch(`${API}/files`, {
                credentials: "include"
            });

            setFiles(await res.json());
        };

        xhr.send(formData);
    };

    const remove = async (id) => {
        await fetch(`${API}/files/${id}`, {
            method: "DELETE",
            credentials: "include"
        });

        setFiles(files.filter(f => f.id !== id));
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            <div className="max-w-6xl mx-auto p-6">

                {/* HEADER */}
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-semibold tracking-tight">
                        QS Assets
                    </h1>

                    <div className="flex items-center gap-3">
                        {user && (
                            <div className="text-sm text-zinc-400">
                                {user.username}
                            </div>
                        )}

                        <a
                            href={`${API}/logout`}
                            className="text-sm px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition"
                        >
                            Logout
                        </a>
                    </div>
                </div>

                {/* UPLOAD CARD */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-8 shadow-lg">
                    <div className="flex flex-col md:flex-row gap-4 items-center">

                        <input
                            type="file"
                            onChange={e => setFile(e.target.files[0])}
                            className="text-sm"
                        />

                        <button
                            onClick={upload}
                            className="bg-indigo-600 hover:bg-indigo-500 transition px-5 py-2 rounded-xl font-medium shadow"
                        >
                            Upload
                        </button>

                    </div>

                    {/* PROGRESS BAR */}
                    {progress > 0 && (
                        <div className="w-full bg-zinc-800 h-2 mt-4 rounded-full overflow-hidden">
                            <div
                                className="bg-indigo-500 h-2 transition-all"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    )}
                </div>

                {/* FILE GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {files.map(f => (
                        <div
                            key={f.id}
                            className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-indigo-500 transition group"
                        >
                            {/* IMAGE */}
                            {f.type.startsWith("image") && (
                                <img
                                    src={f.url}
                                    className="h-40 w-full object-cover group-hover:scale-105 transition"
                                />
                            )}

                            {/* CONTENT */}
                            <div className="p-4">
                                <div className="text-sm font-medium truncate">
                                    {f.name}
                                </div>

                                <div className="flex justify-between items-center mt-3">
                                    <a
                                        href={f.url}
                                        target="_blank"
                                        className="text-xs text-indigo-400 hover:underline"
                                    >
                                        Open
                                    </a>

                                    <button
                                        onClick={() => remove(f.id)}
                                        className="text-xs text-red-400 hover:text-red-300"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* EMPTY STATE */}
                {files.length === 0 && (
                    <div className="text-center text-zinc-500 mt-16">
                        No files uploaded yet
                    </div>
                )}

            </div>
        </div>
    );
}