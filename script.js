// Simple nav active state on click
const navLinks = document.querySelectorAll('.nav-link');

navLinks.forEach(link => {
  link.addEventListener('click', () => {
    navLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');
  });
});

// Internship image lightbox
const internshipImg = document.querySelector('.internship-image');
const internshipLightbox = document.getElementById('internshipLightbox');

if (internshipImg && internshipLightbox) {
  internshipImg.style.cursor = 'zoom-in';

  internshipImg.addEventListener('click', () => {
    internshipLightbox.classList.add('open');
  });

  internshipLightbox.addEventListener('click', () => {
    internshipLightbox.classList.remove('open');
  });
}
