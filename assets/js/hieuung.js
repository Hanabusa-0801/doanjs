
AOS.init({
  duration: 1000, // thời gian chạy hiệu ứng (ms)
  once: false     // chạy lại khi cuộn lại
});


(function() {
  const items = document.querySelectorAll('.slide-item'); 

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Thêm inline style cho hiệu ứng
          entry.target.style.transition = "transform 0.6s ease, opacity 0.6s ease";
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateX(0)";
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    items.forEach(el => {
      // Khởi tạo trạng thái ban đầu lệch ngang + mờ
      if (el.dataset.dir === "left") {
        el.style.transform = "translateX(-50px)";
      } else {
        el.style.transform = "translateX(50px)";
      }
      el.style.opacity = "0";
      io.observe(el);
    });
  }
})();