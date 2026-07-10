import { api } from "./api.js";


const nameInput = document.querySelector("#profile-name");
const emailInput = document.querySelector("#profile-email");
const academicInput = document.querySelector("#academic-level");
const institutionInput = document.querySelector("#institution");
const majorInput = document.querySelector("#major");
const semesterInput = document.querySelector("#semester");

const avatarLarge =
document.querySelector(".avatar-large");

const sidebarAvatar =
document.querySelector("#user-avatar");


let profileImage = "";


// ==========================
// LOAD PROFILE
// ==========================

async function loadProfile(){

    try{

        const profile =
        await api("/profile");


        nameInput.value =
        profile.name || "";

        emailInput.value =
        profile.email || "";

        academicInput.value =
        profile.academic_level || "";

        institutionInput.value =
        profile.institution || "";

        majorInput.value =
        profile.major || "";

        semesterInput.value =
        profile.semester || "";



        profileImage =
        profile.profile_image || "";



        if(profileImage){

            showPhoto(profileImage);

        }



        document.querySelector("#display-name")
        .textContent =
        profile.name || "Student";


        document.querySelector("#display-course")
        .textContent =
        profile.major || "";


        document.querySelector("#display-level")
        .textContent =
        profile.academic_level || "";



    }
    catch(error){

        console.log(
        "Profile loading error",
        error
        );

    }

}



loadProfile();




// ==========================
// SHOW PHOTO
// ==========================

function showPhoto(image){

    if(avatarLarge){

        avatarLarge.innerHTML =
        `
        <img src="${image}"
        style="
        width:100%;
        height:100%;
        border-radius:50%;
        object-fit:cover;">
        `;

    }



    if(sidebarAvatar){

        sidebarAvatar.src =
        image;

    }

}





// ==========================
// SAVE PROFILE
// ==========================

async function saveProfile(){

    try{


        const data = {

            name:nameInput.value,

            email:emailInput.value,

            academic_level:
            academicInput.value,

            institution:
            institutionInput.value,

            major:
            majorInput.value,

            semester:
            semesterInput.value,

            profile_image:
            profileImage

        };



        const result =
        await api(
        "/profile",
        {
            method:"PUT",
            body:data
        });



        alert(result.message);


        loadProfile();


    }
    catch(error){

        console.log(error);

        alert("Update failed");

    }

}




// ==========================
// PHOTO CHANGE
// ==========================


const photoBtn =
document.querySelector("#change-photo");


const photoInput =
document.querySelector("#photo-input");



photoBtn.addEventListener(
"click",
()=>{

    photoInput.click();

});




photoInput.addEventListener(
"change",
e=>{


const file =
e.target.files[0];


if(!file)
return;



const reader =
new FileReader();



reader.onload = ()=>{


    profileImage =
    reader.result;


    showPhoto(profileImage);


};


reader.readAsDataURL(file);


});





// SAVE BUTTON

document
.querySelector("#save-profile")
.addEventListener(
"click",
saveProfile
);




// PASSWORD

document
.querySelector("#change-password")
.addEventListener(
"click",
changePassword
);



async function changePassword(){


const current =
document.querySelector("#current-password").value;


const newPassword =
document.querySelector("#new-password").value;



try{

const result =
await api(
"/profile/password",
{
method:"PUT",
body:{
current_password:current,
new_password:newPassword
}
});


alert(result.message);


}

catch(error){

alert(error.message);

}


}