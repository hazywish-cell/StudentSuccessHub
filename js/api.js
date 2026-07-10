// ==========================
// API CONFIG
// ==========================

// While developing locally, talk to your local FastAPI server.
// In production, talk to the deployed Render service.
const PROD_API_URL = "https://studentsuccesshub-4.onrender.com";

const BASE_URL =
    (location.hostname === "localhost" || location.hostname === "127.0.0.1")
        ? "http://127.0.0.1:8000"
        : PROD_API_URL;

// The AI chat server (server/server.js, the Node/Gemini backend) is a
// SEPARATE service from the FastAPI backend above. Render gives each
// service its own URL — if/when you deploy server/ to Render, put that
// service's URL here.
const PROD_CHAT_URL = "https://studentsuccesshub-4.onrender.com"; // TODO: replace if the chat server gets its own Render service

export const CHAT_BASE_URL =
    (location.hostname === "localhost" || location.hostname === "127.0.0.1")
        ? "http://localhost:5000"
        : PROD_CHAT_URL;

const TOKEN_KEY = "ssp_token";
const USER_KEY = "ssp_user";


// ==========================
// SESSION MANAGEMENT
// ==========================

export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
    try {
        const user = localStorage.getItem(USER_KEY);
        return user ? JSON.parse(user) : null;
    } catch (err) {
        console.error("User parsing error:", err);
        return null;
    }
}

export function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}


// ==========================
// AUTH GUARD
// ==========================

export function requireAuth() {
    const token = getToken();

    if (!token) {
        window.location.href = "login.html";
        return false;
    }

    return true;
}


// ==========================
// CORE API FUNCTION
// ==========================

export async function api(path, options = {}) {
    const {
        method = "GET",
        body = null,
        auth = true
    } = options;

    const headers = {
        "Content-Type": "application/json"
    };

    // Attach token if required
    if (auth) {
        const token = getToken();
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
    }

    let response;

    try {
        response = await fetch(BASE_URL + path, {
            method,
            headers,
            body: body ? JSON.stringify(body) : null
        });
    } catch (err) {
        toast("Network error. Server not reachable.", "error");
        throw new Error("Network error");
    }

    // Parse response safely
    let data;
    const text = await response.text();

    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    // Handle unauthorized
    if (response.status === 401) {
        clearSession();
        toast("Session expired. Please login again.", "error");
        window.location.href = "login.html";
        return;
    }

    // Handle other errors
    if (!response.ok) {
        throw new Error(data?.detail || "Request failed");
    }

    return data;
}


// ==========================
// TOAST SYSTEM (IMPROVED)
// ==========================

let toastTimeout;

export function toast(message, type = "") {
    let box = document.querySelector(".toast");

    if (!box) {
        box = document.createElement("div");
        box.className = "toast";
        document.body.appendChild(box);
    }

    box.textContent = message;
    box.className = `toast ${type}`;

    // prevent overlapping glitches
    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
        box.className = "toast";
    }, 2500);
}