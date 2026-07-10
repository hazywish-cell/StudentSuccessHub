import { getToken } from "./api.js";

console.log("home.js loaded");

const token = null;

if (token) {
  document.querySelectorAll(".nav-actions a").forEach((link) => {
    if (link.href.includes("login.html")) {
      link.href = "dashboard.html";

      if (link.textContent.includes("Log in")) {
        link.textContent = "Dashboard";
      }

      if (link.textContent.includes("Get started")) {
        link.textContent = "Open Dashboard";
      }
    }
  });
}


const features = [
  {
    icon:"M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
    title:"Study task manager",
    desc:"Add, edit, delete and complete study tasks."
  },

  {
    icon:"M12 2l2.4 7.4H22l-6 4.6 2.3 7.4L12 17l-6.3 4.4L8 14 2 9.4h7.6z",
    title:"Priority levels",
    desc:"Organize tasks using High, Medium and Low priority."
  },

  {
    icon:"M12 6v6l4 2M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z",
    title:"Pomodoro timer",
    desc:"Stay focused with study and break sessions."
  },

  {
    icon:"M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z",
    title:"Notes",
    desc:"Save study notes and reminders."
  },

  {
    icon:"M3 3v18h18M7 14l4-4 3 3 5-6",
    title:"Progress tracking",
    desc:"Track your completed tasks."
  }
];


const featureGrid = document.getElementById("features");


if(featureGrid){

featureGrid.innerHTML = features.map(f => `

<div class="feature-card">

<div class="feature-icon">

<svg width="22" height="22"
viewBox="0 0 24 24"
fill="none"
stroke="currentColor"
stroke-width="2">

<path d="${f.icon}"/>

</svg>

</div>

<h3>${f.title}</h3>

<p>${f.desc}</p>

</div>

`).join("");

}