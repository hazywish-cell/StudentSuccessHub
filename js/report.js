import { api, getUser, requireAuth } from "./api.js";

requireAuth();

console.log("REPORT JS LOADED");

// ==========================
// ELEMENTS
// ==========================
const studentName = document.getElementById("student-name");
const userName = document.getElementById("sidebar-user-name");
const userAvatar = document.getElementById("user-avatar");
const totalCard = document.getElementById("card-total-tasks");
const completedCard = document.getElementById("card-completed-tasks");
const pendingCard = document.getElementById("card-pending-tasks");
const progressCard = document.getElementById("card-study-progress");

const dateBadge = document.getElementById("current-date-badge");

// ==========================
// USER DETAILS
// ==========================
const user = getUser();
if (user && userName) {
    userName.textContent = user.name || "Student";
}

// ==========================
// PROFILE PHOTO
// ==========================
async function loadProfilePhoto() {
    try {
        const profile = await api("/profile");
        if (profile?.profile_image && userAvatar) {
            userAvatar.src = profile.profile_image;
        }
    } catch (error) {
        console.log("Photo error", error);
    }
}
loadProfilePhoto();

// ==========================
// DATE
// ==========================
if (dateBadge) {
    dateBadge.textContent = new Date().toLocaleDateString("en-US", {
        month: "long",
        year: "numeric"
    });
}

// ==========================
// TOAST
// ==========================
function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast " + type;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}

// ==========================
// LOAD REPORT
// ==========================
async function loadReport() {
    try {
        const from = document.getElementById("from-date")?.value;
        const to = document.getElementById("to-date")?.value;

        let url = "/reports";

        if (from && to) {
            url += `?from_date=${encodeURIComponent(from)}&to_date=${encodeURIComponent(to)}`;
        }

        const data = await api(url);
        console.log("REPORT DATA", data);

            const summary = data?.summary || {
    total_tasks: 0,
    completed_tasks: 0,
    pending_tasks: 0,
    progress: 0
};
        // student name
        if (studentName) studentName.value = data?.student || "";

        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        setText("prev-student-name", data?.student || "-");

        if (totalCard) totalCard.textContent = summary.total_tasks || 0;
        if (completedCard) completedCard.textContent = summary.completed_tasks || 0;
        if (pendingCard) pendingCard.textContent = summary.pending_tasks || 0;
        if (progressCard) progressCard.textContent = (summary.progress || 0) + "%";

        setText("prev-total-tasks", summary.total_tasks || 0);
        setText("prev-completed-tasks", summary.completed_tasks || 0);
        setText("prev-pending-tasks", summary.pending_tasks || 0);
        setText("prev-progress-pct", (summary.progress || 0) + "%");

        const fill = document.getElementById("prev-progress-fill");
        if (fill) fill.style.width = (summary.progress || 0) + "%";

        setText("prev-generated-date", new Date().toLocaleDateString());

        showToast("Report generated successfully");

    } catch (error) {
        console.log(error);
        showToast("Report failed", "error");
    }
}

// ==========================
// BUTTON EVENTS (SAFE)
// ==========================
document.getElementById("filter-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    loadReport();
});

document.getElementById("btn-generate-bottom")?.addEventListener("click", loadReport);

document.getElementById("btn-clear-top")?.addEventListener("click", () => {
    document.getElementById("from-date").value = "";
    document.getElementById("to-date").value = "";
    loadReport();
});

document.getElementById("btn-clear-bottom")?.addEventListener("click", () => {
    document.querySelectorAll(".metric-value").forEach(x => {
        x.textContent = "0";
    });
    showToast("Report cleared");
});

// ==========================
// PRINT
// ==========================
document.getElementById("btn-print")?.addEventListener("click", () => {
    window.print();
});

// ==========================
// PDF DOWNLOAD
// ==========================
document.getElementById("btn-download-pdf")?.addEventListener("click", async () => {
    try {
        const report = document.getElementById("printable-area");
        if (!report) return alert("Report not found");

        const canvas = await html2canvas(report, {
            scale: 2,
            backgroundColor: "#ffffff",
            useCORS: true
        });

        const imgData = canvas.toDataURL("image/png");

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF("p", "mm", "a4");

        const width = pdf.internal.pageSize.getWidth();
        const height = (canvas.height * width) / canvas.width;

        pdf.addImage(imgData, "PNG", 0, 0, width, height);
        pdf.save("Student_Success_Hub_Report.pdf");

    } catch (err) {
        console.log(err);
        alert("PDF generation failed");
    }
});

// ==========================
// INIT
// ==========================
window.addEventListener("DOMContentLoaded", loadReport);