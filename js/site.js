(function () {
  'use strict';

  function initializeLazyVideos() {
    var videos = Array.prototype.slice.call(document.querySelectorAll('video[data-lazy-video]'));
    if (!videos.length) return;

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function loadVideo(video) {
      if (video.dataset.loaded === 'true') return;

      Array.prototype.forEach.call(video.querySelectorAll('source[data-src]'), function (source) {
        source.src = source.dataset.src;
        source.removeAttribute('data-src');
      });
      video.dataset.loaded = 'true';
      video.load();

      if (reduceMotion) {
        video.removeAttribute('autoplay');
        video.controls = true;
      }
    }

    if (!('IntersectionObserver' in window)) {
      videos.forEach(loadVideo);
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var video = entry.target;
        if (entry.isIntersecting) {
          loadVideo(video);
          if (!reduceMotion) {
            var playback = video.play();
            if (playback && typeof playback.catch === 'function') playback.catch(function () {});
          }
        } else if (video.dataset.loaded === 'true') {
          video.pause();
        }
      });
    }, { rootMargin: '300px 0px' });

    videos.forEach(function (video) {
      observer.observe(video);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLazyVideos);
  } else {
    initializeLazyVideos();
  }
})();
