import { setSession, api, toast } from "./api.js";


const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");


// LOGIN

if(loginForm){

loginForm.addEventListener("submit", async(e)=>{

e.preventDefault();


const email =
document.getElementById("login-email").value;


const password =
document.getElementById("login-password").value;



try{

const data = await api("/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false
});

setSession(
data.token,
data.user
);



window.location.href="dashboard.html";


}

catch(error){

toast(error.message || "Login failed", "error");

}


});

}





// REGISTER

if(registerForm){


registerForm.addEventListener("submit",async(e)=>{


e.preventDefault();



const name =
document.getElementById("reg-name").value;


const email =
document.getElementById("reg-email").value;


const password =
document.getElementById("reg-password").value;




try{

const data = await api("/auth/register", {
    method: "POST",
    body: { name, email, password },
    auth: false
});

setSession(
data.token,
data.user
);



window.location.href="dashboard.html";


}

catch(error){

toast(error.message || "Registration failed", "error");

}



});

}





// tabs

const loginTab =
document.getElementById("tab-login");


const registerTab =
document.getElementById("tab-register");



if(loginTab && registerTab){


loginTab.onclick=()=>{

loginForm.classList.remove("hidden");

registerForm.classList.add("hidden");

};



registerTab.onclick=()=>{


registerForm.classList.remove("hidden");

loginForm.classList.add("hidden");


};


}