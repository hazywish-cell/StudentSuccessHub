import { toast } from "./api.js";


// Pomodoro Timer
export function initPomodoro() {


  const timeEl =
    document.getElementById("pomo-time");

  const startBtn =
    document.getElementById("pomo-start");

  const resetBtn =
    document.getElementById("pomo-reset");

  const countEl =
    document.getElementById("pomo-count");

  const modeBtns =
    document.querySelectorAll(".pomo-mode");



  // Stop if dashboard elements are not found
  if (
    !timeEl ||
    !startBtn ||
    !resetBtn ||
    !countEl
  ) {
    return;
  }




  let totalSeconds = 25 * 60;

  let remaining = totalSeconds;

  let intervalId = null;

  let running = false;

  let currentMode = "Focus";




  const today =
    new Date().toDateString();



  const stored =
    JSON.parse(
      localStorage.getItem("ssp_pomo") || "{}"
    );



  let sessions =
    stored.date === today
      ? stored.count || 0
      : 0;



  countEl.textContent = sessions;




  function saveSessions() {

    localStorage.setItem(
      "ssp_pomo",
      JSON.stringify({
        date: today,
        count: sessions
      })
    );

  }





  function render() {


    const minutes =
      String(
        Math.floor(remaining / 60)
      ).padStart(2, "0");



    const seconds =
      String(
        remaining % 60
      ).padStart(2, "0");



    timeEl.textContent =
      `${minutes}:${seconds}`;



    document.title =
      running
        ? `${minutes}:${seconds} — ${currentMode}`
        : "Dashboard — Smart Study Planner";

  }






  function stop() {

    clearInterval(intervalId);

    intervalId = null;

    running = false;

    startBtn.textContent = "Start";

  }







  function complete() {


    stop();



    if (currentMode === "Focus") {


      sessions++;


      countEl.textContent =
        sessions;


      saveSessions();



      toast(
        "Focus session complete! Take a break.",
        "success"
      );


    } else {


      toast(
        "Break finished. Back to focus!",
        "success"
      );

    }




    remaining = totalSeconds;


    render();

  }







  startBtn.addEventListener(
    "click",
    () => {


      if (running) {

        stop();

        return;

      }



      running = true;


      startBtn.textContent =
        "Pause";



      intervalId =
        setInterval(() => {


          remaining--;



          if (remaining <= 0) {


            remaining = 0;


            render();


            complete();


            return;

          }



          render();



        },1000);


    }
  );









  resetBtn.addEventListener(
    "click",
    () => {


      stop();


      remaining =
        totalSeconds;


      render();


    }
  );









  modeBtns.forEach(
    (btn) => {


      btn.addEventListener(
        "click",
        () => {


          stop();



          modeBtns.forEach(
            b =>
            b.classList.remove("active")
          );



          btn.classList.add("active");



          currentMode =
            btn.dataset.mode;



          totalSeconds =
            parseInt(
              btn.dataset.minutes,
              10
            ) * 60;



          remaining =
            totalSeconds;



          render();


        }
      );


    }
  );





  render();

}