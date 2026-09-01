import { useState, useRef } from "react";
import axios from "axios";
import "./MediaUpload.css";

interface Props {
  onUpload: (file: File, preview: string) => void;
  onClose?: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || "/api";
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export default function MediaUpload({ onUpload, onClose }: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/gif", "video/mp4", "video/webm"];
    if (!validTypes.includes(file.type)) {
      alert("Unsupported file type. Use JPG, PNG, GIF, MP4, or WebM");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert("File too large. Maximum 50MB");
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      onUpload(selectedFile, preview);
      setSelectedFile(null);
      setPreview("");
      onClose?.();
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="media-upload-modal">
      <button className="upload-close-btn" onClick={onClose}>✕</button>

      <div className="upload-area">
        {preview ? (
          <div className="upload-preview">
            {selectedFile?.type.startsWith("image/") ? (
              <img src={preview} alt="preview" className="preview-image" />
            ) : (
              <video src={preview} className="preview-video" controls />
            )}
          </div>
        ) : (
          <div
            className="upload-dropzone"
            onClick={() => fileInputRef.current?.click()}
          >
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path
                d="M24 8V32M8 24L24 8L40 24"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <rect
                x="4"
                y="36"
                width="40"
                height="4"
                rx="2"
                fill="currentColor"
                opacity="0.3"
              />
            </svg>
            <p>Click to select file or drag and drop</p>
            <span>JPG, PNG, GIF, MP4, WebM • Max 50MB</span>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,video/mp4,video/webm"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />
      </div>

      {preview && (
        <div className="upload-actions">
          <button
            className="upload-btn cancel"
            onClick={() => {
              setSelectedFile(null);
              setPreview("");
            }}
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            className="upload-btn send"
            onClick={handleUpload}
            disabled={uploading || !selectedFile}
          >
            {uploading ? "Uploading..." : "Send"}
          </button>
        </div>
      )}
    </div>
  );
}
