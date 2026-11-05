(function () {
  'use strict';

  function initializeLazyVideos() {
    var videos = Array.prototype.slice.call(document.querySelectorAll('video[data-lazy-video]'));
    if (!videos.length) return;

    var motionPreference = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    var reduceMotion = motionPreference && motionPreference.matches;
    var states = new Map();

    // Manage autoplay here, before loading a source, to respect reduced motion.
    videos.forEach(function (video) {
      video.removeAttribute('autoplay');
      video.controls = !!reduceMotion;
      var state = { userPaused: false, automaticPause: false };
      states.set(video, state);

      function showControls() { video.controls = true; }
      function hideControls() {
        if (!reduceMotion && !video.paused && document.activeElement !== video && !video.matches(':hover')) {
          video.controls = false;
        }
      }
      video.addEventListener('pointerenter', showControls);
      video.addEventListener('pointerdown', showControls);
      video.addEventListener('focus', showControls);
      video.addEventListener('pointerleave', hideControls);
      video.addEventListener('blur', hideControls);
      video.addEventListener('pause', function () {
        if (state.automaticPause) state.automaticPause = false;
        else state.userPaused = true;
      });
      video.addEventListener('play', function () { state.userPaused = false; });
      video.addEventListener('keydown', function (event) {
        if (event.target !== video || event.key !== ' ' || event.altKey || event.ctrlKey || event.metaKey) return;
        event.preventDefault();
        if (video.paused) {
          loadVideo(video);
          playVideo(video);
        } else video.pause();
      });
    });

    function playVideo(video) {
      var playback = video.play();
      if (playback && typeof playback.catch === 'function') {
        playback.catch(function () { video.controls = true; });
      }
    }

    function pauseAutomatically(video) {
      if (video.paused) return;
      states.get(video).automaticPause = true;
      video.pause();
    }

    function loadVideo(video) {
      if (video.dataset.loaded === 'true') return;

      Array.prototype.forEach.call(video.querySelectorAll('source[data-src]'), function (source) {
        source.src = source.dataset.src;
        source.removeAttribute('data-src');
      });
      video.dataset.loaded = 'true';
      video.load();
    }

    if (motionPreference && motionPreference.addEventListener) {
      motionPreference.addEventListener('change', function (event) {
        reduceMotion = event.matches;
        if (reduceMotion) videos.forEach(function (video) {
          pauseAutomatically(video);
          video.controls = true;
        });
      });
    }

    if (!('IntersectionObserver' in window)) {
      videos.forEach(function (video) {
        loadVideo(video);
        if (!reduceMotion) playVideo(video);
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var video = entry.target;
        var state = states.get(video);
        if (entry.isIntersecting) {
          loadVideo(video);
          if (!reduceMotion && !state.userPaused) playVideo(video);
        } else if (video.dataset.loaded === 'true') {
          pauseAutomatically(video);
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
