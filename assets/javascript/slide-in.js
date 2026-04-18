function initSlidingDiv(messageContent) {
  var slidingDiv = document.createElement("div");
  slidingDiv.id = "sliding-div";
  slidingDiv.textContent = messageContent;

  Object.assign(slidingDiv.style, {
    fontSize: "36px",
    fontWeight: "bold",
    fontFamily: "Nedar",
    border: "solid aliceblue 4px",
    display: "flex",
    width: "50%",
    height: "200px",
    position: "absolute",
    right: "25%",
    top: "-200px",
    background: "color(srgb 0.1026 0 0.2014)",
    color: "aliceblue",
    transition: "top 0.4s ease",
    textAlign: "center",
    alignItems: "center",
    justifyContent: "center",
  });


  setTimeout(function () {
    slidingDiv.style.top = "0";
  }, 1000);

  setTimeout(function () {
    slidingDiv.style.top = "-200px";
  }, 10000);
  document.body.appendChild(slidingDiv);
}

export { initSlidingDiv };
