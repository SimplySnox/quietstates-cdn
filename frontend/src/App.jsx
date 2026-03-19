import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "https://qs-assets-api.up.railway.app";

const categories = ["all", "audio", "thumbnails", "logos", "branding", "misc"];

export default function App() {
    const [files, setFiles] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [category, setCategory] = useState("misc");
    const [filter, setFilter] = useState("all");

    const fetchFiles = async () => {
        const res = await fetch(`${API}/files`);
        const data = await res.json();
        setFiles(data);
    };

    useEffect(() => {
        fetchFiles();
    }, []);

    const upload = async () => {
        if (!selectedFile) return;

        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("category", category);
        formData.append("uploader", "qs-user");

        await fetch(`${API}/upload`, {
            method: "POST",
            body: formData
        });

        setSelectedFile(null);
        fetchFiles();
    };

    const filtered =
        filter === "all" ? files : files.filter(f => f.category === filter);

    return (
        <div style={{ padding: 20 }}>
            <h1>QS Assets</h1>

            <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} />

            <select onChange={(e) => setCategory(e.target.value)}>
                {categories.slice(1).map(c => (
                    <option key={c}>{c}</option>
                ))}
            </select>

            <button onClick={upload}>Upload</button>

            <hr />

            {categories.map(c => (
                <button key={c} onClick={() => setFilter(c)}>
                    {c}
                </button>
            ))}

            <hr />

            {filtered.map(file => (
                <div key={file.id}>
                    <a href={file.url} target="_blank">{file.name}</a>
                    <div>{file.category}</div>
                </div>
            ))}
        </div>
    );
}