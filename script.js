document.getElementById("hamburger-btn").addEventListener("click", function () {
  var headerLinks = document.querySelector(".header-links-container");
  if (headerLinks.classList.contains("hidden")) {
    headerLinks.classList.remove("hidden");
  } else {
    headerLinks.classList.add("hidden");
  }
});

const carousel = document.querySelector(".carousel");

let isDown = false;

let startX;

let scrollLeft;

carousel.addEventListener("mousedown", (e) => {

isDown = true;

startX = e.pageX - carousel.offsetLeft;

scrollLeft = carousel.scrollLeft;

});

carousel.addEventListener("mouseleave", () => {

isDown = false;

});

carousel.addEventListener("mouseup", () => {

isDown = false;

});

carousel.addEventListener("mousemove", (e) => {

if (!isDown) return;

e.preventDefault();

const x = e.pageX - carousel.offsetLeft;

const walk = x - startX;

carousel.scrollLeft = scrollLeft - walk;

});