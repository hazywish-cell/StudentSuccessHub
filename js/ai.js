import {
    api,
    requireAuth,
    CHAT_BASE_URL
} from "./api.js";


requireAuth();

// ===============================
// LOAD SIDEBAR PROFILE
// ===============================

async function loadSidebarProfile() {

    try {

        const profile = await api("/profile");

        const avatar =
            document.getElementById("user-avatar");

        if (avatar) {
            avatar.src =
                profile.profile_image || "images/default-user.png";
        }

        const name =
            document.getElementById("sidebar-user-name");

        if (name) {
            name.textContent =
                profile.name || "Student";
        }

    } catch (error) {

        console.log("Profile loading error:", error);

    }

}

loadSidebarProfile();


// ===============================
// CHAT
// ===============================


const chatBox =
document.getElementById("chatBox");


const input =
document.getElementById("userInput");


const sendBtn =
document.getElementById("sendBtn");



window.onload=function(){

    loadChatHistory();

};



sendBtn.addEventListener(
"click",
sendMessage
);


input.addEventListener("keydown", function (e) {

    if (e.key === "Enter" && !e.shiftKey) {

        e.preventDefault();

        sendMessage();

    }

});
async function sendMessage(){
    

    let message =
    input.value.trim();



    if(message===""){
        return;
    }



    addMessage(
        message,
        "user"
    );


    saveMessage(
        message,
        "user"
    );



    input.value="";



    addMessage(
        "Thinking 🤖...",
        "ai"
    );



    try{


        const response =
        await fetch(
        CHAT_BASE_URL + "/chat",
        {


            method:"POST",


            headers:{


                "Content-Type":
                "application/json"


            },


            body:JSON.stringify({

                message:message

            })


        });



        const data =
        await response.json();



        chatBox.lastChild.remove();



        addMessage(
            data.reply,
            "ai"
        );


        saveMessage(
            data.reply,
            "ai"
        );



    }
    catch(error){



        chatBox.lastChild.remove();



        let errorMessage =
        "AI server is not connected 🚨";


        addMessage(
            errorMessage,
            "ai"
        );


        saveMessage(
            errorMessage,
            "ai"
        );



        console.log(error);



    }



}









function addMessage(text,type){


    let div =
    document.createElement("div");



    div.className =
    type==="user"
    ?
    "chat-message user-message"
    :
    "chat-message ai-message";



   div.textContent = text;



    chatBox.appendChild(div);



    chatBox.scrollTop =
    chatBox.scrollHeight;


}








function saveMessage(message,type){


    let history =
    JSON.parse(
    localStorage.getItem("aiHistory")
    ) || [];



    history.push({

        message,
        type,
        time:
        new Date().toLocaleString()

    });



    localStorage.setItem(
        "aiHistory",
        JSON.stringify(history)
    );


}








function loadChatHistory(){


    let history =
    JSON.parse(
    localStorage.getItem("aiHistory")
    ) || [];



    history.forEach(chat=>{


        addMessage(
            chat.message,
            chat.type
        );


    });


}






window.quickMessage=function(text){


    input.value=text;


    sendMessage();


}
