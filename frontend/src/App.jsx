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
        <div className="min-h-screen bg-zinc-950 text-white p-6">
            <h1 className="text-3xl mb-4">QS Assets</h1>

            <input type="file" onChange={e => setFile(e.target.files[0])} />
            <button onClick={upload} className="ml-2 bg-indigo-600 px-4 py-2 rounded">
                Upload
            </button>

            {progress > 0 && (
                <div className="w-full bg-zinc-800 h-2 mt-2">
                    <div
                        className="bg-indigo-500 h-2"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}

            <div className="grid grid-cols-3 gap-4 mt-6">
                {files.map(f => (
                    <div key={f.id} className="bg-zinc-900 p-3 rounded">
                        {f.type.startsWith("image") && (
                            <img src={f.url} className="h-32 w-full object-cover" />
                        )}

                        <div className="text-sm mt-2">{f.name}</div>

                        <button
                            onClick={() => remove(f.id)}
                            className="text-red-400 text-xs mt-2"
                        >
                            Delete
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}