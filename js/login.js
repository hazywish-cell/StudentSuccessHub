import { setSession } from "./api.js";

const form = document.getElementById("login-form");

if(form){

form.addEventListener("submit",(e)=>{

e.preventDefault();


const email =
document.getElementById("email").value;


const password =
document.getElementById("password").value;


// demo login
setSession(
"demo-token",
{
name:"Student"
}
);


window.location.href="dashboard.html";


});

}